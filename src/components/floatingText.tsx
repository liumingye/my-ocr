import { memo, MouseEventHandler } from "react";

const fontStack =
  "Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif";

// 预测文本宽度
const calculateTextWidth = (text: string, textStyle: string) => {
  const canvasElement = document.createElement("canvas");
  const context = canvasElement.getContext("2d");
  if (!context) {
    throw new Error(
      "Failed to get the 2D rendering context for the canvas element."
    );
  }
  context.font = textStyle + " " + fontStack;
  const textMetrics = context.measureText(text);
  return textMetrics.width;
};

const euclideanDistance = (
  [x1, y1]: [number, number],
  [x2, y2]: [number, number]
) => {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
};

const FloatingText = ({
  data,
  showText,
  showBorder,
  onContextMenu,
}: {
  data: OcrData[] | string | undefined;
  showText: boolean;
  showBorder: boolean;
  onContextMenu: MouseEventHandler<HTMLDivElement>;
}) => {
  if (!Array.isArray(data)) return;
  return data.map((item) => {
    if (!item.box) return;

    const [tl, tr, br] = item.box;

    const transform = "matrix(1,0,0,1," + tl[0] + "," + tl[1] + ")";

    const horizontalDistance = euclideanDistance(tl, tr);
    const verticalDistance = euclideanDistance(tr, br);
    const shorterSide = Math.min(horizontalDistance, verticalDistance);
    const longerSide = Math.max(horizontalDistance, verticalDistance);

    let letterSpacing = 0;
    const textWidth = calculateTextWidth(item.text, shorterSide + "px");
    let adjustedHeight = shorterSide;
    if (longerSide > textWidth + 5) {
      const textLength = item.text.length;
      const extraSpace = (longerSide - textWidth) / (textLength - 1);
      if (extraSpace !== Infinity) {
        letterSpacing = extraSpace;
      }
    } else if (longerSide < textWidth) {
      const scaleRatio = longerSide / textWidth;
      adjustedHeight = shorterSide * scaleRatio;
    }
    let textTransform = "";
    if (adjustedHeight < 12) {
      const scaleValue = adjustedHeight / 12;
      textTransform = `scale(${scaleValue})`;
      adjustedHeight = 12;
    }

    return (
      <div
        key={item.text}
        className="absolute cursor-text leading-none whitespace-nowrap origin-top-left"
        style={{
          letterSpacing,
          fontSize: adjustedHeight,
          width: longerSide,
          height: shorterSide,
          transform: transform,
          background: showText ? "var(--color-neutral-4)" : "",
          border: showBorder ? "1px solid #bb1133" : "",
        }}
        onContextMenuCapture={onContextMenu}
      >
        {showText && (
          <>
            <span
              style={{
                transform: textTransform,
                userSelect: "text",
              }}
            >
              {item.text}
            </span>
            {item.end === "\n" ? (
              <br
                style={{
                  userSelect: "text",
                }}
              />
            ) : (
              item.end
            )}
          </>
        )}
      </div>
    );
  });
};

export default memo(FloatingText);
