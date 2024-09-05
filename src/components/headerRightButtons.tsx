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
  ReactElement,
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

const HeaderLeftButtons2 = memo(({ children }) => {
  return <Children />;
});

const HeaderLeftButtons = memo(
  ({
    savePic,
    selectCardId,
    // scale,
    adapt,
    actual,
    children,
  }: {
    savePic: (id: string) => void;
    selectCardId: string;
    // scale: number;
    adapt: () => void;
    actual: () => void;
    children: ReactElement;
  }) => {
    return (
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
        {/* <span className="text-[12px]">{scale}%</span> */}
        {children}
      </div>
    );
  }
);

export default HeaderLeftButtons;
