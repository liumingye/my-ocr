import { ipcRenderer, ipcMain } from "electron";

/* eslint-disable no-console */
import { IpcRendererEvent } from "electron";
import { Display } from "../main/screenshots/getDisplay";

window.ipcRenderer = ipcRenderer;

declare global {
  interface Window {
    screenshots: any;
  }
}

type IpcRendererListener = (
  event: IpcRendererEvent,
  ...args: unknown[]
) => void;
type ScreenshotsListener = (...args: unknown[]) => void;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotsData {
  bounds: Bounds;
  display: Display;
}

const map = new Map<ScreenshotsListener, Record<string, IpcRendererListener>>();

window.screenshots = {
  ready: () => {
    console.log("contextBridge ready");

    ipcRenderer.send("SCREENSHOTS:ready");
  },
  reset: () => {
    console.log("contextBridge reset");

    ipcRenderer.send("SCREENSHOTS:reset");
  },
  save: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => {
    console.log("contextBridge save", arrayBuffer, data);

    ipcRenderer.send("SCREENSHOTS:save", Buffer.from(arrayBuffer), data);
  },
  cancel: () => {
    console.log("contextBridge cancel");

    ipcRenderer.send("SCREENSHOTS:cancel");
  },
  ok: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => {
    console.log("contextBridge ok", arrayBuffer, data);

    ipcRenderer.send("SCREENSHOTS:ok", Buffer.from(arrayBuffer), data);
  },
  on: (channel: string, fn: ScreenshotsListener) => {
    console.log("contextBridge on", fn);

    const listener = (event: IpcRendererEvent, ...args: unknown[]) => {
      console.log("contextBridge on", channel, fn, ...args);
      fn(...args);
    };

    const listeners = map.get(fn) ?? {};
    listeners[channel] = listener;
    map.set(fn, listeners);

    ipcRenderer.on(`SCREENSHOTS:${channel}`, listener);
  },
  off: (channel: string, fn: ScreenshotsListener) => {
    console.log("contextBridge off", fn);

    const listeners = map.get(fn) ?? {};
    const listener = listeners[channel];
    delete listeners[channel];

    if (!listener) {
      return;
    }

    ipcRenderer.off(`SCREENSHOTS:${channel}`, listener);
  },
};

const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
darkThemeMq.addEventListener("change", (e) => {
  if (e.matches) {
    document.body.setAttribute("arco-theme", "dark");
  } else {
    document.body.removeAttribute("arco-theme");
  }
});

if (matchMedia("(prefers-color-scheme: dark)").matches) {
  document.body.setAttribute("arco-theme", "dark");
}
