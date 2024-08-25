import { Menu, BrowserWindow, ipcMain } from "electron";
import { quit } from "./index";

export function getTrayMenu(win: BrowserWindow) {
  return Menu.buildFromTemplate([
    {
      label: "打开",
      click: () => {
        win.show();
      },
    },
    {
      label: "截图",
      click: () => {
        ipcMain.emit("startCapture");
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        quit();
      },
    },
  ]);
}
