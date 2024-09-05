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
import {
  useState,
  useReducer,
  useRef,
  useEffect,
  MutableRefObject,
  Dispatch,
  memo,
  SetStateAction,
} from "react";
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

const HeaderLeftButtons = memo(
  ({
    showText,
    setShowText,
    showBorder,
    setShowBorder,
  }: {
    showText: boolean;
    showBorder: boolean;
    setShowText: Dispatch<SetStateAction<boolean>>;
    setShowBorder: Dispatch<SetStateAction<boolean>>;
  }) => {
    return (
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
    );
  }
);

export default HeaderLeftButtons;
