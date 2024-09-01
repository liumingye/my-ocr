import "./app.css";
import "@arco-design/web-react/dist/css/arco.css";
import {
  useState,
  useReducer,
  useRef,
  useEffect,
  MutableRefObject,
} from "react";
import {
  Card,
  Space,
  Layout,
  Divider,
  Input,
  Upload,
  Message,
  ResizeBox,
  Button,
  Checkbox,
  Tag,
} from "@arco-design/web-react";
import { nanoid } from "nanoid";
import { Menu, MenuItem, getCurrentWindow, clipboard } from "@electron/remote";
import MediaFrame from "@/components/mediaFrame";
import FloatingText from "@/components/floatingText";
import CardContent from "@/components/cardContent";
import {
  IconPaste,
  IconCamera,
  IconScissor,
  IconFontColors,
  IconExpand,
  IconOriginalSize,
  IconFullscreen,
  IconSave,
} from "@arco-design/web-react/icon";
import {
  App as LeaferApp,
  Image as LeaferImage,
  ImageEvent,
  MoveEvent,
  ZoomEvent,
  Text,
} from "leafer-ui";
import { ScrollBar } from "@leafer-in/scroll";
import { useSize, useThrottleFn } from "ahooks";
import { isAcceptFile } from "@/utils";

// 选中文本右键菜单增加复制功能
const handleContextMenu = () => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: "剪切", role: "cut" }));
  menu.append(new MenuItem({ label: "复制", role: "copy" }));
  menu.append(new MenuItem({ label: "粘贴", role: "paste" }));
  menu.popup({
    window: getCurrentWindow(),
  });
};

type OcrListState = {
  id: string;
  img_data?: string;
  state?: number;
  text?: {
    code: number;
    data: OcrData[] | string;
    score?: number;
  };
  start_time?: number;
  end_time?: number;
};

type OcrListAction =
  | {
      type: "add" | "update" | "delete";
      payload: OcrListState;
    }
  | {
      type: "empty";
    };

function App() {
  const pasteImageRef = useRef(window);
  const [selectCardId, setSelectCardId] = useState("");
  const [textareaText, setTextareaText] = useState("");
  const [selectImage, setSelectImage] = useState("");
  const [selectCardIndex, setSelectCardIndex] = useState(-1);
  const [isMedia, setIsMedia] = useState(false);

  const [showText, setShowText] = useState(true);
  const [showBorder, setShowBorder] = useState(false);

  const mediaViewRef = useRef<HTMLDivElement>(null);

  const leafer = useRef<LeaferApp>() as MutableRefObject<LeaferApp>;
  const [transform, setTransform] = useState("translate(0px, 0px) scale(1)");

  const adapt = () => {
    leafer.current.tree.zoom("fit", 0.0001);
    leafer.current.tree.emitEvent({
      type: ZoomEvent.ZOOM,
    });
  };

  const actual = () => {
    leafer.current.tree.zoom(1);
    leafer.current.tree.emitEvent({
      type: ZoomEvent.ZOOM,
    });
  };

  useEffect(() => {
    if (!mediaViewRef.current || isMedia) return;

    leafer.current = new LeaferApp({
      view: mediaViewRef.current,

      tree: {
        wheel: { zoomMode: "mouse", zoomSpeed: 0.01 },
        zoom: { min: 0.3 },
        move: {
          drag: "auto",
          holdMiddleKey: false,
          disabled: false,
          // scroll: "limit",
        },
      },
      sky: {
        type: "draw",
        move: {
          drag: "auto",
          // disabled: true,
        },
      },
    });

    const scroll = new ScrollBar(leafer.current);
    scroll.on(MoveEvent.DRAG, () => {
      leafer.current.tree.emitEvent({
        type: ZoomEvent.ZOOM,
      });
    });

    if (selectImage) {
      const mediaImage = new LeaferImage({
        x: 0,
        y: 0,
        fill: "#000",
        // around: "center",
        url: selectImage,
      });

      leafer.current.tree.on([ZoomEvent.ZOOM, MoveEvent.MOVE], (e) => {
        // console.log("move", e);
        const point = mediaImage.getWorldPoint({ x: 0, y: 0 });
        setTransform(
          `translate(${point.x}px,${point.y}px) scale(${leafer.current.tree.scaleX},${leafer.current.tree.scaleY})`
        );
      });

      mediaImage.on(ImageEvent.LOADED, () => {
        // 加载完图片的时候，适应窗口大小
        adapt();
      });

      leafer.current.tree.add(mediaImage);
    } else {
      const color = window
        .getComputedStyle(document.body)
        .getPropertyValue("--color-text-1");
      const text = new Text({
        text: "截图、拖入或粘贴图片",
        fontSize: 16,
        fill: color,
      });
      leafer.current.tree.add(text);
      leafer.current.config.zoom = {
        ...leafer.current.config.zoom,
        min: 1,
        max: 1,
      };
      leafer.current.config.move = {
        ...leafer.current.config.move,
        disabled: true,
        drag: false,
      };
      // leafer.current.zoom("fit", 50);
    }

    // 切换Card后的时候，适应窗口大小
    adapt();

    return () => {
      leafer.current.destroy(); // 开发环境useEffect会执行2次，必须及时销毁
    };
  }, [isMedia, selectImage]);

  const size = useSize(mediaViewRef);

  const resize = useThrottleFn(
    () => {
      if (size) {
        leafer.current.tree.zoom("fit", 0.0001, !!!selectImage);
        leafer.current.tree.emitEvent({
          type: ZoomEvent.ZOOM,
        });
      }
    },
    { wait: 100 }
  );

  useEffect(() => {
    resize.run();
  }, [size]);

  let [globalConfig, setGlobalConfig] = useState({
    tbpu: "multi_para",
  });

  const resetCardClick = () => {
    setTextareaText("");
    setSelectCardId("");
    setSelectCardIndex(-1);
    setSelectImage("");
  };

  const onCardClick = (item: OcrListState, index: number) => {
    setTextareaText(extractText(item.text));
    setSelectCardId(item.id);
    setSelectCardIndex(index);
    if (!!item.img_data) {
      setSelectImage(item.img_data);
    }
    setIsMedia(false);
    console.info("onCardClick", item, index);
  };

  const savePic = (id: string) => {
    const current = ocrList.find((item) => item.id === id);
    if (!current || !current.img_data) return;
    const a = document.createElement("a");
    a.href = current.img_data;
    a.setAttribute("download", Date.now().toString());
    a.click();
  };

  const orcListReducer = (state: OcrListState[], action: OcrListAction) => {
    switch (action.type) {
      case "add":
        return [...state, action.payload];
      case "update":
        return state.map((item) => {
          if (item.id === action.payload.id) {
            if (item.id === selectCardId && action.payload.state === 1) {
              setTextareaText(extractText(action.payload.text));
            }
            return { ...item, ...action.payload };
          }
          return item;
        });
      case "delete":
        return state.filter((item) => item.id !== action.payload.id);
      case "empty":
        return [];
      default:
        return state;
    }
  };
  const [ocrList, orcListDispach] = useReducer(orcListReducer, []);

  const pasteHandler = (e: ClipboardEvent) => {
    const { clipboardData } = e;
    if (!clipboardData) return;

    const { items } = clipboardData;
    const { length } = items;

    let blob = null;
    for (let i = 0; i < length; i++) {
      const item = items[i];
      if (item.type.startsWith("image")) {
        blob = item.getAsFile(); // blob中就是截图的文件，获取后可以上传到服务器
        blob && startOcr(blob);
      }
    }
  };

  const dragHandler = (e: DragEvent) => {
    e.preventDefault();
    switch (e.type) {
      case "drop":
        const dt = e.dataTransfer;
        if (!dt) return;
        const files = dt.files;
        for (let index = 0; index < files.length; index++) {
          const file = files[index];
          startOcr(file);
        }
        break;
      default:
        break;
    }
  };

  // 绑定拖拽事件
  useEffect(() => {
    document.body.addEventListener("drop", dragHandler, false);
    document.body.addEventListener("dragover", dragHandler, false);
    return () => {
      document.body.removeEventListener("drop", dragHandler, false);
      document.body.removeEventListener("dragover", dragHandler, false);
    };
  }, []);

  // 绑定粘贴事件
  useEffect(() => {
    pasteImageRef.current?.addEventListener("paste", pasteHandler);
    return () => {
      pasteImageRef.current?.removeEventListener("paste", pasteHandler);
    };
  }, []);

  useEffect(() => {
    const onOk = (_e: Electron.IpcRendererEvent, buffer: Buffer) => {
      const file = new File([buffer], Date.now() + ".png", {
        type: "image/png",
      });
      startOcr(file);
    };
    window.ipcRenderer.on("SCREENSHOTS:ok", onOk);
    return () => {
      window.ipcRenderer.off("SCREENSHOTS:ok", onOk);
    };
  });

  const thriftClientOcr = (id: string, imgOrPath: string) => {
    if (window.thriftClientA == null) return;
    window.thriftClientA.ocr(id, imgOrPath, globalConfig, (error, res) => {
      if (error) {
        console.error("ocr error", error);
        orcListDispach({
          type: "update",
          payload: {
            id,
            text: { code: 101, data: [{ text: "识别出错了", end: "" }] },
            state: -1,
            end_time: Date.now(),
          },
        });
      } else {
        console.log("ocr ok", id, ocrList.length);
        orcListDispach({
          type: "update",
          payload: {
            id,
            text: transferData(res),
            state: 1,
            end_time: Date.now(),
          },
        });
      }
    });
  };

  const startOcr = (thing: File | string) => {
    if (window.thriftClientA == null) {
      setTimeout(() => {
        console.log("thriftClient is null, try 1 second later");
        startOcr(thing);
      }, 1000);
      return;
    }
    const id = nanoid();
    // 判断参数类型
    if (thing instanceof File) {
      // 文件 类型
      console.info(
        "startOcr",
        id,
        // thing.path,
        !thing.path,
        window.thriftClientA
      );
      orcListDispach({
        type: "add",
        payload: {
          id: id,
          text: { code: 101, data: [{ text: "正在识别中...", end: "" }] },
          state: 0,
          img_data: "",
          start_time: Date.now(),
        },
      });
      const reader = new FileReader();
      reader.onload = (e) => {
        const img_b64 = e.target?.result?.toString();
        if (!img_b64) return;
        // 更新缩略图
        orcListDispach({
          type: "update",
          payload: { id: id, img_data: img_b64 },
        });
        if (!thing.path) {
          thriftClientOcr(id, img_b64);
        }
      };
      reader.onerror = (e) => {
        console.info("error:" + e);
      };
      reader.readAsDataURL(thing);
      if (!!thing.path) {
        thriftClientOcr(id, thing.path);
      }
    } else {
      // base64 类型
      console.info("startOcr", id, thing, window.thriftClientA);
      orcListDispach({
        type: "add",
        payload: {
          id: id,
          text: { code: 101, data: [{ text: "正在识别中...", end: "" }] },
          state: 0,
          img_data: thing,
          start_time: Date.now(),
        },
      });
      thriftClientOcr(id, thing);
    }
    return id;
  };

  function transferData(jsonData: string | object) {
    let data = jsonData;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (error) {
        // not json
      }
    }
    if (data instanceof Object) {
      return data as OcrListState["text"];
    }
    return { code: 101, data: [{ text: "transfer data error", end: "" }] };
  }

  // 提取所有的文本内容
  function extractText(jsonData: OcrListState["text"] | undefined) {
    let data: OcrListState["text"] | undefined = jsonData;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (error: any) {
        return error.toString();
      }
    }
    if (!Array.isArray(data?.data)) return data?.data?.toString() || "";
    return data.data.reduce((text, item) => text + item.text + item.end, "");
  }

  useEffect(() => {
    const toggleDevTools = (ev: KeyboardEvent) => {
      if (ev.key === "F12") {
        window.ipcRenderer.send("toggleDevTools");
      }
    };
    window.addEventListener("keyup", toggleDevTools);
    return () => {
      window.removeEventListener("keyup", toggleDevTools);
    };
  }, []);

  return (
    <div className="layout-basic-app">
      <Layout className="h-full">
        <Layout.Sider
          className="sider flex"
          style={{
            minWidth: 300,
            maxWidth: "60%",
            width: 300,
          }}
        >
          <div className="left-side-toolbar">
            <Space className="mb-2" size={17}>
              <Button
                icon={<IconScissor />}
                onClick={() => {
                  window.ipcRenderer.send("startCapture");
                }}
              >
                截图
              </Button>
              <Button
                icon={<IconPaste />}
                onClick={() => {
                  navigator.clipboard.read().then(async (items) => {
                    for (const item of items) {
                      for (const type of item.types) {
                        if (type.indexOf("image/") !== 0) return;
                        const blob = await item.getType(type);
                        if (blob) {
                          const file = new File([blob], Date.now() + ".png", {
                            type,
                          });
                          startOcr(file);
                        }
                      }
                    }
                  });
                }}
              >
                粘贴
              </Button>
              <Button
                icon={<IconCamera />}
                onClick={() => {
                  resetCardClick();
                  setIsMedia(!isMedia);
                }}
              >
                拍照
              </Button>
              {/* <Button
                onClick={() => {
                  if (
                    uploadRef.current &&
                    "getRootDOMNode" in uploadRef.current
                  ) {
                    const getRoot = uploadRef.current
                      .getRootDOMNode as Function;
                    const rootDOMNode = getRoot() as HTMLElement;
                    (rootDOMNode?.firstChild as HTMLInputElement)?.click();
                  }
                }}
              >
                上传
              </Button> */}
            </Space>
            <Upload
              // ref={uploadRef}
              showUploadList={false}
              beforeUpload={(file) => {
                startOcr(file);
                return false;
              }}
              drag
              multiple
              accept="image/*"
              action="/"
              onDrop={(e) => {
                let uploadFile = e.dataTransfer.files[0];
                if (isAcceptFile(uploadFile, "image/*")) {
                  return;
                } else {
                  Message.info("不接受的文件类型，请重新上传指定文件类型~");
                }
              }}
              tip="只支持图片格式如：.jpg .png .gif, .jpeg, .bmp"
            />
          </div>
          <Divider className="left-side-divider !my-0" />
          <div className="left-side-content overflow-y-auto">
            {ocrList.map((item, index) => {
              return (
                <Card
                  key={index}
                  style={{ marginTop: 10 }}
                  onClick={() => onCardClick(item, index)}
                  className={selectCardIndex === index ? "card-selected" : ""}
                  onContextMenuCapture={() => {
                    let menu = new Menu();
                    menu.append(
                      new MenuItem({
                        label: "删除",
                        click: () => {
                          orcListDispach({
                            type: "delete",
                            payload: { id: item.id },
                          });
                          resetCardClick();
                        },
                      })
                    );
                    menu.append(
                      new MenuItem({
                        label: "保存",
                        click: () => {
                          savePic(item.id);
                        },
                      })
                    );
                    menu.append(
                      new MenuItem({
                        label: "清空",
                        click: () => {
                          orcListDispach({
                            type: "empty",
                          });
                          resetCardClick();
                        },
                      })
                    );
                    menu.popup({
                      window: getCurrentWindow(),
                    });
                  }}
                >
                  <CardContent
                    text={extractText(item.text)}
                    state={item.state || -1}
                    img_data={item.img_data || ""}
                  />
                </Card>
              );
            })}
          </div>
        </Layout.Sider>
        {isMedia ? (
          <MediaFrame
            onTake={(base64) => {
              if (window.thriftClientB == null) return;
              window.thriftClientB.rectify(base64, (_, res) => {
                console.log("rectify comp", res);
                const data = JSON.parse(res);
                startOcr("data:image/jpeg;base64," + data.data);
              });
            }}
          />
        ) : (
          <ResizeBox.Split
            direction="horizontal"
            style={{
              width: "100%",
              border: "1px solid var(--color-border)",
            }}
            max={0.8}
            min={0.2}
            panes={[
              <div className="flex flex-col relative h-full w-full overflow-hidden">
                <div className="h-[24px] flex justify-between px-px">
                  <div className="shrink-0">
                    <Checkbox
                      className="!px-px"
                      checked={showText}
                      onClick={() => {
                        setShowText(!showText);
                      }}
                      title="在图片上叠加显示识别文字"
                    >
                      {() => {
                        return (
                          <Tag
                            size="small"
                            bordered
                            icon={<IconFontColors />}
                            className="!text-[12px]"
                            color={showText ? "orange" : ""}
                          >
                            文字
                          </Tag>
                        );
                      }}
                    </Checkbox>
                    <Checkbox
                      className="!px-px"
                      checked={showBorder}
                      onClick={() => {
                        setShowBorder(!showBorder);
                      }}
                      title="在图片上叠加显示识别边框"
                    >
                      {() => {
                        return (
                          <Tag
                            size="small"
                            bordered
                            icon={<IconExpand />}
                            className="!text-[12px]"
                            color={showBorder ? "orange" : ""}
                          >
                            边框
                          </Tag>
                        );
                      }}
                    </Checkbox>
                  </div>
                  <div className="pr-1 shrink-0">
                    <Button
                      className="mr-1"
                      icon={<IconSave />}
                      onClick={() => savePic(selectCardId)}
                      size="mini"
                      title="保存图片"
                    ></Button>
                    <Button
                      className="mr-1"
                      icon={<IconFullscreen />}
                      onClick={adapt}
                      size="mini"
                      title="图片大小：适应窗口"
                    ></Button>
                    <Button
                      className="mr-1"
                      icon={<IconOriginalSize />}
                      onClick={actual}
                      size="mini"
                      title="图片大小：实际大小"
                    ></Button>
                    {leafer.current && leafer.current.tree.scaleX && (
                      <span className="text-[12px]">
                        {Math.floor(leafer.current.tree.scaleX * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <div
                    ref={mediaViewRef}
                    className="h-full overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-bg-3)",
                    }}
                  ></div>
                  <div
                    className="absolute top-0 left-0 origin-top-left"
                    style={{
                      transform,
                    }}
                    // 事件转发
                    onWheelCapture={({ nativeEvent: event }) => {
                      const canvas = leafer.current
                        .view as HTMLCanvasElement | null;
                      canvas?.dispatchEvent(
                        new WheelEvent("wheel", {
                          clientX: event.clientX,
                          clientY: event.clientY,
                          deltaY: event.deltaY,
                          deltaX: event.deltaX,
                          deltaZ: event.deltaZ,
                          buttons: event.buttons,
                        })
                      );
                    }}
                  >
                    <FloatingText
                      data={ocrList[selectCardIndex]?.text?.data}
                      showText={showText}
                      showBorder={showBorder}
                      onContextMenu={handleContextMenu}
                    />
                  </div>
                </div>
              </div>,
              <div className="flex flex-col h-full">
                {ocrList[selectCardIndex] ? (
                  ocrList[selectCardIndex].state === 1 &&
                  ocrList[selectCardIndex].id === selectCardId ? (
                    <>
                      {ocrList[selectCardIndex].state === 1 && (
                        <div className="h-[24px] text-[12px] flex justify-between items-center px-1">
                          <div>
                            <span>
                              {"耗时 "}
                              {(
                                ((ocrList[selectCardIndex].end_time || 0) -
                                  (ocrList[selectCardIndex].start_time || 0)) /
                                1000
                              ).toFixed(2)}
                            </span>
                            {"s | "}
                            <span>
                              {"置信度 "}
                              {ocrList[selectCardIndex]?.text?.score?.toFixed(
                                2
                              )}
                            </span>
                          </div>
                          <Button
                            type="text"
                            className="!px-0 !h-auto !leading-none !text-xs"
                            onClick={() => {
                              clipboard.writeText(textareaText);
                              Message.success("复制成功");
                            }}
                          >
                            复制
                          </Button>
                        </div>
                      )}
                      <Input.TextArea
                        spellCheck="false"
                        className="content-textarea !h-full"
                        placeholder=""
                        style={{ resize: "none" }}
                        value={textareaText}
                        onChange={(value) => {
                          setTextareaText(value);
                        }}
                        onContextMenuCapture={handleContextMenu}
                      />
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      {textareaText}
                    </div>
                  )
                ) : (
                  <div className="h-full flex items-center justify-center">
                    空
                  </div>
                )}
              </div>,
            ]}
          />
        )}
      </Layout>
    </div>
  );
}

export default App;
