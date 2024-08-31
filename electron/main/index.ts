// Modules to control application life and create native browser window
import remote from "@electron/remote/main";
import {
  app,
  Menu,
  BrowserWindow,
  Tray,
  globalShortcut,
  // dialog,
  ipcMain,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
// import fs from "node:fs";
import { getTrayMenu } from "./menu";
import { update } from "./update";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
// import { createRequire } from "node:module";
import Screenshots from "./screenshots";

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

const isWindows = os.platform() === "win32";
const isMac = os.platform() === "darwin";

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (isWindows) app.setAppUserModelId(app.getName());

// 单个实例
if (!process.env.VITE_DEV_SERVER_URL && !app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

remote.initialize();
Menu.setApplicationMenu(null);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");
const indexHtml = path.join(RENDERER_DIST, "index.html");

let forceQuit = false;
export function setForceQuit() {
  forceQuit = true;
}
export function quit() {
  setForceQuit();
  app.quit();
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    minWidth: 800,
    minHeight: 500,
    width: 1200,
    height: 600,
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(process.env.VITE_PUBLIC, "logo.png"),
    // icon: path.join(__dirname, "logo.ico"),
  });

  mainWindow.on("close", (event) => {
    if (!forceQuit) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
  });

  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(process.env.VITE_PUBLIC, "logo.png"));
  }

  // and load the index.html of the app.
  if (VITE_DEV_SERVER_URL) {
    // #298
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(indexHtml);
  }

  // Open the DevTools.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  remote.enable(mainWindow.webContents);

  update(mainWindow);

  const screenshots = new Screenshots({
    singleWindow: false,
    logger: (...args: any) => {
      console.log(...args);
    },
  });

  let lastVisualStatus = true;

  screenshots.on("startCapture", (_e) => {
    if (!mainWindow) return;
    lastVisualStatus = mainWindow.isVisible();
    mainWindow.hide();
  });

  screenshots.on("endCapture", (_e) => {
    if (!mainWindow) return;
    if (lastVisualStatus) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  screenshots.on("ok", (_e, buffer) => {
    if (!mainWindow) return;
    mainWindow.webContents.send("SCREENSHOTS:ok", buffer);
    mainWindow.show();
    mainWindow.focus();
  });

  ipcMain.on("startCapture", () => {
    screenshots.startCapture();
  });

  ipcMain.on("toggleDevTools", () => {
    if (!mainWindow) return;
    mainWindow.webContents.toggleDevTools();
  });

  globalShortcut.register("ctrl+shift+a", () => {
    screenshots.startCapture();
  });

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  let mainWindow = createWindow();
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "logo.png"));
  tray.setToolTip("MY-OCR");
  const menu = getTrayMenu(mainWindow);
  if (isMac) {
    // using tray.setContextMenu() on macOS will open the menu on left-click, so instead we'll
    // manually bind the right-click event to open the menu
    tray.addListener("right-click", () => {
      tray?.popUpContextMenu(menu);
    });
  } else {
    tray.setContextMenu(menu);
  }
  tray.addListener("click", () => {
    mainWindow?.show();
  });
});

app.on("before-quit", () => {
  // if CMD+Q is pressed, we want to quit the app even if we're using a Menu/Tray icon
  setForceQuit();
});

app.on("activate", function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].show();
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  mainWindow = null;
  if (!isMac) app.quit();
});

app.on("second-instance", () => {
  if (mainWindow) {
    // Focus on the main window if the user tried to open another
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let pyProc: ChildProcessWithoutNullStreams | null = null;

const createPyProc = () => {
  let script = path.join(process.env.APP_ROOT, "release/ocr_server/ocr_server");
  if (app.isPackaged) {
    script = path.join(process.env.APP_ROOT, "../../ocr_server/ocr_server");
  }
  pyProc = spawn(script);
  if (pyProc != null) {
    console.log("child process success");
  }
  pyProc.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  pyProc.stderr.on("data", (data) => {
    console.log(`stderr: ${data}`);
  });
};

const exitPyProc = () => {
  pyProc?.kill();
  pyProc = null;
};

app.on("ready", createPyProc);
app.on("will-quit", exitPyProc);
