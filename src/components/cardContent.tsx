import { memo } from "react";
import { Space, Avatar } from "@arco-design/web-react";
import { IconCheck, IconClose, IconLoading } from "@arco-design/web-react/icon";

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
            WebkitLineClamp: "3",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
          }}
          className="ocr-content"
        >
          {text}
        </div>
      </Space>
      {state === 1 ? (
        <IconCheck />
      ) : state === 0 ? (
        <IconLoading />
      ) : (
        <IconClose />
      )}
    </Space>
  );
};

export default memo(CardContent);
