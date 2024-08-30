import type { ProgressInfo } from "electron-updater";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/update/Modal";
import Progress from "@/components/update/Progress";
import "./update.css";

const Update = () => {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>();
  const [updateError, setUpdateError] = useState<ErrorType>();
  const [progressInfo, setProgressInfo] = useState<Partial<ProgressInfo>>();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalBtn, setModalBtn] = useState<{
    cancelText?: string;
    okText?: string;
    onCancel?: () => void;
    onOk?: () => void;
  }>({
    onCancel: () => setModalOpen(false),
    onOk: () => window.ipcRenderer.invoke("start-download"),
  });

  const checkUpdate = async () => {
    setChecking(true);
    /**
     * @type {import('electron-updater').UpdateCheckResult | null | { message: string, error: Error }}
     */
    await window.ipcRenderer.invoke("check-update");
    // const result = await window.ipcRenderer.invoke("check-update");
    setProgressInfo({ percent: 0 });
    setChecking(false);
    // setModalOpen(true);
    // if (result?.error) {
    //   setUpdateAvailable(false);
    //   setUpdateError(result?.error);
    // }
  };

  const onUpdateCanAvailable = useCallback(
    (_event: Electron.IpcRendererEvent, arg1: VersionInfo) => {
      setVersionInfo(arg1);
      setUpdateError(undefined);
      // Can be update
      if (arg1.update) {
        setModalOpen(true);
        setModalBtn((state) => ({
          ...state,
          cancelText: "取消",
          okText: "更新",
          onOk: () => window.ipcRenderer.invoke("start-download"),
        }));
        setUpdateAvailable(true);
      } else {
        // setModalOpen(false);
        setUpdateAvailable(false);
      }
    },
    []
  );

  const onUpdateError = useCallback(
    (_event: Electron.IpcRendererEvent, arg1: ErrorType) => {
      setUpdateAvailable(false);
      setUpdateError(arg1);
    },
    []
  );

  const onDownloadProgress = useCallback(
    (_event: Electron.IpcRendererEvent, arg1: ProgressInfo) => {
      setProgressInfo(arg1);
    },
    []
  );

  const onUpdateDownloaded = useCallback(
    (_event: Electron.IpcRendererEvent, ...args: any[]) => {
      setModalOpen(true);
      setProgressInfo({ percent: 100 });
      setModalBtn((state) => ({
        ...state,
        cancelText: "下次安装",
        okText: "现在安装",
        onOk: () => {
          window.ipcRenderer.invoke("quit-and-install");
          setModalOpen(false);
        },
      }));
    },
    []
  );

  useEffect(() => {
    // Get version information and whether to update
    window.ipcRenderer.on("update-can-available", onUpdateCanAvailable);
    window.ipcRenderer.on("update-error", onUpdateError);
    window.ipcRenderer.on("download-progress", onDownloadProgress);
    window.ipcRenderer.on("update-downloaded", onUpdateDownloaded);

    return () => {
      window.ipcRenderer.off("update-can-available", onUpdateCanAvailable);
      window.ipcRenderer.off("update-error", onUpdateError);
      window.ipcRenderer.off("download-progress", onDownloadProgress);
      window.ipcRenderer.off("update-downloaded", onUpdateDownloaded);
    };
  }, []);

  useEffect(() => {
    if (!checking) {
      checkUpdate();
      console.log("check update");
    }
  }, []);

  return (
    <>
      <Modal
        open={modalOpen}
        cancelText={modalBtn?.cancelText}
        okText={modalBtn?.okText}
        onCancel={modalBtn?.onCancel}
        onOk={modalBtn?.onOk}
        footer={updateAvailable ? /* hide footer */ null : undefined}
      >
        <div className="modal-slot">
          {updateError ? (
            <div>
              <p>下载新版本时发生错误。</p>
              <p>{updateError.message}</p>
            </div>
          ) : updateAvailable ? (
            <div>
              <div>发现新版本：v{versionInfo?.newVersion}</div>
              <div className="new-version__target">
                v{versionInfo?.version} -&gt; v{versionInfo?.newVersion}
              </div>
              <div className="update__progress">
                <div className="progress__title">更新进度：</div>
                <div className="progress__bar">
                  <Progress percent={progressInfo?.percent}></Progress>
                </div>
              </div>
            </div>
          ) : (
            <div className="can-not-available">
              {JSON.stringify(versionInfo ?? {}, null, 2)}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Update;
