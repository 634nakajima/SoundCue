import { app, BrowserWindow, ipcMain, session, systemPreferences, dialog } from "electron";
import { join } from "node:path";
import {
  initSender,
  sendOSC,
  sendOSCFloat,
  setSenderConfig,
  setSenderEnabled,
  getSenderStatus,
  closeSender,
} from "./osc-sender";
import {
  initReceiver,
  setReceiverPort,
  getReceiverStatus,
  closeReceiver,
} from "./osc-receiver";
import {
  initWhisper,
  transcribe,
  isReady as whisperReady,
  isLoading as whisperLoading,
  getModelId as whisperModelId,
} from "./whisper-service";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#111827",
    title: "SoundCue",
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

}

function setupIPC(): void {
  // Generic OSC send from renderer
  ipcMain.on("audio:osc", (_event, address: string, args: Array<{ type: string; value: number | string }>) => {
    sendOSC(address, args.map((a) => ({ type: a.type as "f" | "i" | "s", value: a.value })));
    // Feed back to renderer for OSC monitor
    if (mainWindow) {
      const valueStr = args.map((a) => String(a.value)).join(", ");
      mainWindow.webContents.send("osc:sent", address, valueStr);
    }
  });

  // Convenience: send a single float
  ipcMain.on("audio:osc:float", (_event, address: string, value: number) => {
    sendOSCFloat(address, value);
    if (mainWindow) {
      mainWindow.webContents.send("osc:sent", address, value.toFixed(3));
    }
  });

  // OSC config
  ipcMain.handle("osc:getSendStatus", () => getSenderStatus());
  ipcMain.handle("osc:getReceiveStatus", () => getReceiverStatus());

  ipcMain.handle("osc:updateSendConfig", (_event, host: string, port: number) => {
    setSenderConfig(host, port);
    return getSenderStatus();
  });

  ipcMain.handle("osc:updateReceivePort", (_event, port: number) => {
    setReceiverPort(port);
    return getReceiverStatus();
  });

  ipcMain.handle("osc:setSendEnabled", (_event, enabled: boolean) => {
    setSenderEnabled(enabled);
    return getSenderStatus();
  });

  // Whisper speech recognition
  ipcMain.handle("whisper:init", async (_event, model?: string) => {
    try {
      await initWhisper(model, (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send("whisper:progress", progress);
        }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whisper:transcribe", async (_event, audioData: number[], language: string) => {
    try {
      const float32 = new Float32Array(audioData);
      const result = await transcribe(float32, language);
      return { success: true, text: result.text, chunks: (result as any).chunks };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("whisper:status", () => ({
    ready: whisperReady(),
    loading: whisperLoading(),
    model: whisperModelId(),
  }));

  // File dialog for model ZIP loading
  ipcMain.handle("dialog:selectModelZip", async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select Teachable Machine Model ZIP",
      filters: [{ name: "ZIP files", extensions: ["zip"] }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

function setupOSC(): void {
  initSender();
  initReceiver(9000, (address, args) => {
    if (mainWindow && args.length > 0) {
      mainWindow.webContents.send("config:changed", address, args[0].value);
    }
  });
}

app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    const status = systemPreferences.getMediaAccessStatus("microphone");
    if (status !== "granted") {
      await systemPreferences.askForMediaAccess("microphone");
    }
  }

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "mediaKeySystem", "microphone"];
    callback(allowed.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ["media", "mediaKeySystem", "microphone"];
    return allowed.includes(permission);
  });

  setupIPC();
  setupOSC();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  closeSender();
  closeReceiver();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
