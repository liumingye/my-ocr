import { useState, useReducer, useRef, useEffect } from "react";
import { Button } from "@arco-design/web-react";

interface Properties {
  onTake: (base64: string) => void;
}

function MediaFrame(props: Properties) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isError, setIsError] = useState(false);
  const [video] = useState(document.createElement("video"));
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();

  const mediaWidth = 2304;
  const mediaHeight = 1728;
  const angle = -90;

  function drawScaledAndRotatedImage(
    ctx: CanvasRenderingContext2D,
    image: HTMLVideoElement,
    x: number,
    y: number,
    width: number,
    height: number,
    angle: number
  ) {
    // Calculate the aspect ratio of the image
    const aspectRatio = image.videoWidth / image.videoHeight;

    // Calculate the scaled width and height
    let scaledWidth = height;
    let scaledHeight = width;

    if (aspectRatio < width / height) {
      // scaledHeight = height / aspectRatio;
    } else {
      scaledWidth = width * aspectRatio;
    }
    setIntervalId;
    if (height / aspectRatio < width) {
      // scaledWidth = width;
      // scaledHeight = height;
      // const aspectRatio = image.videoHeight/ image.videoWidth
      if (aspectRatio > width / height) {
        scaledHeight = height / aspectRatio;
        scaledWidth = height;
      }
    }

    // Save the current state of the canvas
    ctx.save();

    // Translate the canvas to the center of the image
    ctx.translate(x + width / 2, y + height / 2);

    // Rotate the canvas by the specified angle
    ctx.rotate((angle * Math.PI) / 180);

    // console.log(scaledWidth, scaledHeight);

    // Draw the image
    ctx.drawImage(
      image,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );

    // Restore the previous state of the canvas
    ctx.restore();
  }

  const startCamera = async () => {
    if (!canvasRef.current) return;
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

      video.srcObject = videoStream;

      const tracks = videoStream.getVideoTracks();
      if (tracks.length > 0) {
        tracks[0].onended = () => {
          // console.log('onended')
          setShowCanvas(false);
          setIsError(true);
          if (intervalId) {
            clearInterval(intervalId);
          }
        };
      }

      video.play();

      const context = canvasRef.current?.getContext("2d");
      console.log(video.srcObject);

      const id = setInterval(() => {
        requestAnimationFrame(() => {
          if (!canvasRef.current || !context) return;

          const width = canvasRef.current.clientWidth;
          const height = canvasRef.current.clientHeight;

          canvasRef.current.width = width;
          canvasRef.current.height = height;

          drawScaledAndRotatedImage(context, video, 0, 0, width, height, angle);
        });
      }, 1000 / 30);
      setIntervalId(id);

      setShowCanvas(true);
      // setIsError(false);
    } catch (_e) {
      setShowCanvas(false);
      setIsError(true);
    }
  };

  const takePicture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = mediaHeight;
    canvas.height = mediaWidth;
    const context = canvas.getContext("2d");
    if (!context) return;
    drawScaledAndRotatedImage(
      context,
      video,
      0,
      0,
      canvas.width,
      canvas.height,
      angle
    );
    const base64 = canvas.toDataURL('image/jpeg');
    props.onTake(base64);
  };

  useEffect(() => {
    if (canvasRef.current) {
      startCamera();
    }
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
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: showCanvas ? "" : "none",
        }}
      ></canvas>
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
