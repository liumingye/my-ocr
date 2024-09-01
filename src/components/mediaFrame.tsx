import { useState, useRef, useEffect, MutableRefObject, memo } from "react";
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
  const leafer = useRef<Leafer>();
  const mediaImage = useRef<LeaferImage>();
  const video = useRef(document.createElement("video"));
  const mediaViewRef = useRef<HTMLDivElement>(null);
  const size = useSize(mediaViewRef);

  const resize = useThrottleFn(
    () => {
      if (size && leafer.current) {
        leafer.current.width = size.width;
        leafer.current.height = size.height;
        leafer.current.zoom("fit", 0.0001);
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
        if (!mediaImage.current) return;
        if (
          mediaImage.current.image &&
          (mediaImage.current.image.width !== video.current.videoWidth ||
            mediaImage.current.image.height !== video.current.videoHeight)
        ) {
          // setImageSize();
          // mediaImage.current.image.width = mediaImage.current.width =
          //   video.current.videoWidth;
          // mediaImage.current.image.height = mediaImage.current.height =
          //   video.current.videoHeight;
          leafer.current?.zoom("fit", 0.0001);
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
        };
      }

      setShowCanvas(true);
      setIsError(false);

      if (!mediaViewRef.current) return;

      leafer.current?.destroy();

      leafer.current = new Leafer({
        view: mediaViewRef.current,
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

      mediaImage.current.url =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

      mediaImage.current.on(ImageEvent.LOADED, () => {
        if (mediaImage.current?.image) {
          mediaImage.current.image.view = video.current;
        }
      });

      leafer.current.add(mediaImage.current);

      leafer.current.on(PointerEvent.DOUBLE_CLICK, () => {
        leafer.current?.zoom("fit", 0.0001);
      });

      video.current.onloadedmetadata = () => {
        video.current.play();
        // set image size
        if (mediaImage.current && mediaImage.current.image) {
          mediaImage.current.image.width = mediaImage.current.width =
            video.current.videoWidth;
          mediaImage.current.image.height = mediaImage.current.height =
            video.current.videoHeight;
        }
        leafer.current?.zoom("fit", 0.0001);
      };
    } catch (_e) {
      console.error(_e);
      setShowCanvas(false);
      setIsError(true);
    }
  };

  const takePicture = () => {
    mediaImage.current?.export("jpg").then((result) => {
      props.onTake(result.data);
    });
  };

  useEffect(() => {
    startCamera();
    const take = (ev: KeyboardEvent) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        if (ev.repeat) return;
        takePicture();
      }
    };
    window.addEventListener("keydown", take);
    return () => {
      leafer.current?.destroy(); // 开发环境useEffect会执行2次，必须及时销毁
      window.removeEventListener("keydown", take);
    };
  }, []);

  return (
    <>
      {!showCanvas ? (
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
      ) : (
        <>
          <div
            ref={mediaViewRef}
            className="w-full h-full overflow-hidden"
          ></div>
          <div className="flex flex-col justify-evenly p-4 bg-white">
            <Button
              className="!w-24 !h-24"
              shape="round"
              size="large"
              onClick={() => {
                if (!mediaImage.current || !leafer.current) return;
                mediaImage.current.rotation =
                  (mediaImage.current.rotation || 0) - 90;
                leafer.current.zoom("fit", 0.0001);
              }}
            >
              左转
            </Button>
            <Button
              className="!w-24 !h-24"
              type="primary"
              shape="round"
              size="large"
              onClick={() => {
                takePicture();
              }}
            >
              拍照
            </Button>
            <Button
              className="!w-24 !h-24"
              shape="round"
              size="large"
              onClick={() => {
                if (!mediaImage.current || !leafer.current) return;
                mediaImage.current.rotation =
                  (mediaImage.current.rotation || 0) + 90;
                leafer.current.zoom("fit", 0.0001);
              }}
            >
              右转
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export default memo(MediaFrame);
