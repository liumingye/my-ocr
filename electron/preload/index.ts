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

let background = "#fff";
let fill = "#282c34";
if (matchMedia("(prefers-color-scheme: dark)").matches) {
  document.body.setAttribute("arco-theme", "dark");
  background = "#282c34";
  fill = "#fff";
}

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ["complete", "interactive"]
) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child);
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child);
    }
  },
};

function useLoading() {
  const className = "loaders-css__square-spin";
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: ${fill};
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${background};
  z-index: 9;
}`;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");

  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    },
  };
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = (ev) => {
  ev.data.payload === "removeLoading" && removeLoading();
};

setTimeout(removeLoading, 5000);
