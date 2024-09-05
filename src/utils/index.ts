import { Menu, MenuItem, getCurrentWindow, clipboard } from "@electron/remote";

const menuItems = {
  selectAll: new MenuItem({ label: "全选", role: "selectAll" }),
  undo: new MenuItem({ label: "撤销", role: "undo" }),
  redo: new MenuItem({ label: "恢复", role: "redo" }),
  separator: new MenuItem({ type: "separator" }),
  cut: new MenuItem({ label: "剪切", role: "cut" }),
  copy: new MenuItem({
    label: "复制",
    // role: "copy",
    click: () => {
      // 不带样式复制
      const text = window.getSelection()?.toString();
      if (!text) return;
      clipboard.writeText(text);
    },
  }),
  paste: new MenuItem({ label: "粘贴", role: "paste" }),
};

// 右键菜单
export const handleContextMenu = (
  itemsName: (keyof typeof menuItems)[] = [
    "cut",
    "copy",
    "paste",
    "separator",
    "selectAll",
    "separator",
    "undo",
    "redo",
  ],
  otherMenu: Electron.MenuItem[] = []
) => {
  let menu = new Menu();
  if (itemsName.length > 0) {
    itemsName.forEach((itemName) => {
      menu.append(menuItems[itemName]);
    });
  }
  otherMenu.forEach((m) => {
    menu.append(m);
  });
  menu.popup({
    window: getCurrentWindow(),
  });
};

export const isAcceptFile = (file: File, accept: string) => {
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

export const aDownload = (href: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.setAttribute("download", Date.now().toString());
  a.click();
};
