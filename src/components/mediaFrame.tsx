import { useState, useRef, useEffect, MutableRefObject } from "react";
import { Button } from "@arco-design/web-react";
import {
  Leafer,
  Image as LeaferImage,
  ImageEvent,
  PointerEvent,
} from "leafer-ui";
import "@leafer-in/view";
import { useSize, useThrottleFn } from "ahooks";

interface Properties {
  onTake: (base64: string) => void;
}

function MediaFrame(props: Properties) {
  const [showCanvas, setShowCanvas] = useState(false);
  const [isError, setIsError] = useState(false);
  const leafer = useRef<Leafer>() as MutableRefObject<Leafer>;
  const mediaImage = useRef<LeaferImage>() as MutableRefObject<LeaferImage>;
  const video = useRef(document.createElement("video"));
  const mediaViewRef = useRef<HTMLDivElement>(null);
  const size = useSize(mediaViewRef);

  const resize = useThrottleFn(
    () => {
      if (size) {
        leafer.current.width = size.width;
        leafer.current.height = size.height;
        leafer.current.zoom("fit", 0.0001);
        // leafer.current.config.zoom = {
        //   ...leafer.current.config.zoom,
        // };
      }
    },
    { wait: 100 }
  );

  useEffect(() => {
    resize.run();
  }, [size]);

  const mediaWidth = 2304;
  const mediaHeight = 1728;

  useEffect(() => {
    const timer = setInterval(() => {
      requestAnimationFrame(() => {
        if (
          mediaImage.current.image &&
          (mediaImage.current.image.width !== video.current.videoWidth ||
            mediaImage.current.image.height !== video.current.videoHeight)
        ) {
          mediaImage.current.image.width = mediaImage.current.width =
            video.current.videoWidth;
          mediaImage.current.image.height = mediaImage.current.height =
            video.current.videoHeight;
          leafer.current.zoom("fit", 0.0001);
          // setTimeout(() => {
          //   leafer.current.config.zoom = {
          //     ...leafer.current.config.zoom,
          //     min: leafer.current.scaleX,
          //   };
          // }, 50);
        }
        mediaImage.current.forceUpdate();
      });
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, []);

  const startCamera = async () => {
    setIsError(false);
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            min: 1280,
            ideal: mediaWidth,
            max: mediaWidth,
          },
          height: {
            min: 720,
            ideal: mediaHeight,
            max: mediaHeight,
          },
        },
      });

      video.current.srcObject = videoStream;

      const tracks = videoStream.getVideoTracks();
      if (tracks.length > 0) {
        tracks[0].onended = () => {
          setShowCanvas(false);
          setIsError(true);
          // if (intervalId) {
          //   clearInterval(intervalId);
          // }
        };
      }

      video.current.play();

      mediaImage.current.url = "/logo.png";

      mediaImage.current.on(ImageEvent.LOADED, () => {
        if (mediaImage.current.image) {
          mediaImage.current.image.view = video.current;
        }
      });

      // const id = setInterval(() => {}, 1000 / 30);
      // setIntervalId(id);

      setShowCanvas(true);
      setIsError(false);
    } catch (_e) {
      console.error(_e);
      setShowCanvas(false);
      setIsError(true);
    }
  };

  const takePicture = () => {
    mediaImage.current.export("jpg").then((result) => {
      props.onTake(result.data);
    });
  };

  useEffect(() => {
    leafer.current = new Leafer({
      view: "media-view",
      wheel: { zoomMode: "mouse", zoomSpeed: 0.01 },
      zoom: { min: 0.3 },
      move: {
        drag: "auto",
        // scroll: "limit"
      },
    });

    mediaImage.current = new LeaferImage({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: "#000",
      around: "center",
      rotation: -90,
    });

    leafer.current.add(mediaImage.current);

    leafer.current.on(PointerEvent.DOUBLE_CLICK, () => {
      leafer.current.zoom("fit", 0.0001);
    });

    startCamera();

    return () => {
      leafer.current.destroy(); // 开发环境useEffect会执行2次，必须及时销毁
    };
  }, []);

  return (
    <>
      {!showCanvas && (
        <div className="h-full w-full flex justify-center items-center flex-col">
          {isError ? (
            <>
              <p>打开摄像头失败</p>
              <Button
                className="mt-2"
                type="primary"
                onClick={() => {
                  startCamera();
                }}
              >
                重试
              </Button>
            </>
          ) : (
            <div>加载中...</div>
          )}
        </div>
      )}
      <div
        id="media-view"
        ref={mediaViewRef}
        className="w-full h-full overflow-hidden"
        style={{
          display: showCanvas ? "" : "none",
        }}
      ></div>
      <Button
        className="!absolute bg-#fff bottom-4 !w-16 !h-16 !bg-white left-1/2 -ml-8"
        type="secondary"
        shape="circle"
        style={{
          boxShadow: "0 0 4px 7px #00000010",
          display: showCanvas ? "" : "none",
        }}
        onClick={() => {
          takePicture();
        }}
      ></Button>
    </>
  );
}

export default MediaFrame;
