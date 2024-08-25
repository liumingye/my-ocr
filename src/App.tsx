import "./App.css";
import "@arco-design/web-react/dist/css/arco.css";
import { useState, useReducer, useRef, useEffect } from "react";
import {
  Card,
  Space,
  Layout,
  Divider,
  Avatar,
  Input,
  Upload,
  Message,
  Image,
  ResizeBox,
  Button,
} from "@arco-design/web-react";
import { IconCheck, IconClose, IconLoading } from "@arco-design/web-react/icon";
import { nanoid } from "nanoid";
import { Menu, MenuItem, getCurrentWindow, clipboard } from "@electron/remote";
import type { Client } from "./thrift_ocr_ts/OcrService";

declare global {
  interface Window {
    thriftClient: Client | null;
  }
}

// 选中文本右键菜单增加复制功能
const handleContextMenu = (e: any) => {
  let menu = new Menu();
  menu.append(new MenuItem({ label: "剪切", role: "cut" }));
  menu.append(new MenuItem({ label: "复制", role: "copy" }));
  menu.append(new MenuItem({ label: "粘贴", role: "paste" }));
  menu.popup({
    window: getCurrentWindow(),
  });
};

const isAcceptFile = (file: File, accept: string) => {
  if (accept && file) {
    const accepts = Array.isArray(accept)
      ? accept
      : accept
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x);
    const fileExtension =
      file.name.indexOf(".") > -1 ? file.name.split(".").pop() : "";
    return accepts.some((type) => {
      const text = type && type.toLowerCase();
      const fileType = (file.type || "").toLowerCase();
      // console.log(fileType, text);
      if (text === fileType) {
        // 类似excel文件这种
        // 比如application/vnd.ms-excel和application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        // 本身就带有.字符的，不能走下面的.jpg等文件扩展名判断处理
        // 所以优先对比input的accept类型和文件对象的type值
        return true;
      }
      if (/\*/.test(text)) {
        // image/* 这种通配的形式处理
        // console.log(
        //   "fileType.replace(//.*$/, '') === text.replace(//.*$/, '')",
        //   fileType.replace(/\/.*$/, "") === text.replace(/\/.*$/, "")
        // );
        return fileType.replace(/\/.*$/, "") === text.replace(/\/.*$/, "");
      }
      if (/..*/.test(text)) {
        // .jpg 等后缀名
        // console.log(
        //   "fileExtension === text.replace(/./, '')",
        //   fileExtension === text.replace(/\./, "")
        // );
        return text === `.${fileExtension && fileExtension.toLowerCase()}`;
      }
      return false;
    });
  }
  return !!file;
};

const CardContent = ({
  text,
  state,
  img_data,
}: {
  text: string;
  state: number;
  img_data: string;
}) => {
  return (
    <Space
      className="card-content"
      size="mini"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Space size="medium">
        <Avatar
          style={{
            backgroundColor: "#165DFF",
          }}
          size={64}
          shape="square"
        >
          {img_data ? (
            <img src={img_data} style={{ width: "100%", height: "100%" }} />
          ) : (
            <IconLoading />
          )}
        </Avatar>
        <div
          style={{
            fontSize: "12px",
            height: "auto",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: "4",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
          }}
          className="ocr-content"
        >
          {text}
        </div>
      </Space>
      {state == 1 ? (
        <IconCheck />
      ) : state == 0 ? (
        <IconLoading />
      ) : (
        <IconClose />
      )}
    </Space>
  );
};

type OcrData = {
  text: string;
  end: string;
  score?: number;
  box?: [number, number][];
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

type OcrListAction = {
  type: "add" | "update" | "delete";
  payload: OcrListState;
};

function App() {
  const pasteImageRef = useRef(window);
  const [selectCardId, setSelectCardId] = useState("");
  const [textareaText, setTextareaText] = useState("");
  const [selectImage, setSelectImage] = useState("");
  const [selectCardIndex, setSelectCardIndex] = useState(-1);
  const previewRef = useRef<HTMLDivElement>(null);

  let [globalConfig, setGlobalConfig] = useState({
    tbpu: "multi_para",
  });

  const [visible, setVisible] = useState(false);

  const onCardClick = (item: OcrListState, index: number) => {
    if (!item) {
      console.info("onCardClick1", item, index);
      setSelectCardIndex(-1);
      setTextareaText("");
      setSelectCardId("");
      setSelectImage("");
      setVisible(false);
      return;
    }
    console.info("onCardClick2", item, index);
    setSelectCardIndex(index);
    setTextareaText(extractText(item.text));
    setSelectCardId(item.id);
    if (!!item.img_data) {
      setSelectImage(item.img_data);
    }
    setVisible(true);
  };

  const [ocrList, orcListDispach] = useReducer(
    (state: OcrListState[], action: OcrListAction) => {
      let newState = state;
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
          newState = newState.filter((item) => item.id !== action.payload.id);
          const index = state.findIndex(
            (item) => item.id === action.payload.id
          );
          if (index > -1) {
            if (newState[index]) {
              onCardClick(newState[index], index);
            } else {
              onCardClick(newState[index - 1], index - 1);
            }
          }

          return newState;
        default:
          return state;
      }
    },
    []
  );

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

  useEffect(() => {
    const ok = (_e: Electron.IpcRendererEvent, buffer: Buffer) => {
      const file = new File([buffer], "screenshot.png", {
        type: "image/png",
      });
      startOcr(file);
    };
    window.ipcRenderer.on("SCREENSHOTS:ok", ok);
    return () => {
      window.ipcRenderer.off("SCREENSHOTS:ok", ok);
    };
  });

  const startOcr = (file: File) => {
    if (window.thriftClient == null) {
      setTimeout(() => {
        console.log("thriftClient is null, try 1 second later");
        startOcr(file);
      }, 1000);
      return;
    }
    const id = nanoid();
    console.info("startOcr", id, file.path, !file.path, window.thriftClient);
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

      if (!file.path && window.thriftClient) {
        window.thriftClient.ocr(id, img_b64, globalConfig, (error, res) => {
          if (error) {
            console.error("ocr error", error);
            orcListDispach({
              type: "update",
              payload: {
                id: id,
                text: { code: 101, data: [{ text: "识别出错了", end: "" }] },
                state: -1,
                end_time: Date.now(),
              },
            });
          } else {
            console.log("ocr ok", id, res, ocrList.length);
            orcListDispach({
              type: "update",
              payload: {
                id: id,
                text: transferData(res),
                state: 1,
                end_time: Date.now(),
              },
            });
          }
        });
      }
    };
    reader.onerror = (e) => {
      console.info("error:" + e);
    };
    reader.readAsDataURL(file);
    if (!!file.path) {
      window.thriftClient.ocr(id, file.path, globalConfig, (error, res) => {
        if (error) {
          console.error("ocr error", error);
          orcListDispach({
            type: "update",
            payload: {
              id: id,
              text: { code: 101, data: [{ text: "识别出错了", end: "" }] },
              state: -1,
              end_time: Date.now(),
            },
          });
        } else {
          console.log("ocr ok", id, res, ocrList.length);
          orcListDispach({
            type: "update",
            payload: {
              id: id,
              text: transferData(res),
              state: 1,
              end_time: Date.now(),
            },
          });
        }
      });
    }
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
            <Upload
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
          <div className="left-side-content overflow-auto">
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
        <ResizeBox.Split
          direction="horizontal"
          style={{
            width: "100%",
            border: "1px solid var(--color-border)",
          }}
          max={0.8}
          min={0.2}
          panes={[
            <div className="relative h-full" ref={previewRef}>
              <Image.Preview
                src={selectImage}
                className="previewImage"
                visible={visible}
                onVisibleChange={setVisible}
                getPopupContainer={() => previewRef.current as HTMLElement}
                closable={false}
                maskClosable={false}
                escToExit={false}
              />
            </div>,
            <div className="flex flex-col h-full">
              {ocrList.length > 0 &&
              selectCardIndex !== -1 &&
              ocrList[selectCardIndex] &&
              ocrList[selectCardIndex].state === 1 ? (
                <>
                  <div className="p-1 text-xs flex justify-between">
                    <div>
                      <span>
                        {"耗时 "}
                        {ocrList[selectCardIndex].end_time &&
                          ocrList[selectCardIndex].start_time &&
                          (
                            (ocrList[selectCardIndex].end_time -
                              ocrList[selectCardIndex].start_time) /
                            1000
                          ).toFixed(2)}
                      </span>
                      {" | "}
                      <span>
                        {"置信度 "}
                        {ocrList[selectCardIndex]?.text?.score?.toFixed(2)}
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
                  <Input.TextArea
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
                  {textareaText || "空"}
                </div>
              )}
            </div>,
          ]}
        />
      </Layout>
    </div>
  );
}

export default App;
