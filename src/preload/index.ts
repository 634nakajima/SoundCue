import { contextBridge, ipcRenderer } from "electron";

export interface OSCArg {
  type: "f" | "i" | "s";
  value: number | string;
}

contextBridge.exposeInMainWorld("api", {
  // Audio analysis data: renderer -> main -> OSC (fire-and-forget)
  sendOSC: (address: string, args: OSCArg[]) =>
    ipcRenderer.send("audio:osc", address, args),

  sendOSCFloat: (address: string, value: number) =>
    ipcRenderer.send("audio:osc:float", address, value),

  // OSC config
  getSendStatus: () => ipcRenderer.invoke("osc:getSendStatus"),
  getReceiveStatus: () => ipcRenderer.invoke("osc:getReceiveStatus"),
  updateSendConfig: (host: string, port: number) =>
    ipcRenderer.invoke("osc:updateSendConfig", host, port),
  updateReceivePort: (port: number) =>
    ipcRenderer.invoke("osc:updateReceivePort", port),
  setSendEnabled: (enabled: boolean) =>
    ipcRenderer.invoke("osc:setSendEnabled", enabled),

  // Config changes from OSC input (main -> renderer)
  onConfigChanged: (callback: (address: string, value: number) => void) => {
    ipcRenderer.on("config:changed", (_e, address, value) =>
      callback(address, value)
    );
  },
  removeConfigListener: () => {
    ipcRenderer.removeAllListeners("config:changed");
  },

  // OSC sent feedback (main -> renderer for monitor)
  onOscSent: (callback: (address: string, value: string) => void) => {
    ipcRenderer.on("osc:sent", (_e, address, value) =>
      callback(address, value)
    );
  },
  removeOscSentListener: () => {
    ipcRenderer.removeAllListeners("osc:sent");
  },

  // Whisper speech recognition
  whisperInit: (model?: string) => ipcRenderer.invoke("whisper:init", model),
  whisperTranscribe: (audioData: number[], language: string) =>
    ipcRenderer.invoke("whisper:transcribe", audioData, language),
  whisperStatus: () => ipcRenderer.invoke("whisper:status"),
  onWhisperProgress: (callback: (progress: { status: string; progress?: number; file?: string }) => void) => {
    ipcRenderer.on("whisper:progress", (_e, progress) => callback(progress));
  },
  removeWhisperProgressListener: () => {
    ipcRenderer.removeAllListeners("whisper:progress");
  },

  // CLAP zero-shot audio classification
  clapInit: () => ipcRenderer.invoke("clap:init"),
  clapClassify: (audioData: number[], labels: string[]) =>
    ipcRenderer.invoke("clap:classify", audioData, labels),
  clapStatus: () => ipcRenderer.invoke("clap:status"),
  onClapProgress: (callback: (progress: { status: string; progress?: number; file?: string }) => void) => {
    ipcRenderer.on("clap:progress", (_e, progress) => callback(progress));
  },
  removeClapProgressListener: () => {
    ipcRenderer.removeAllListeners("clap:progress");
  },

  // File dialog
  selectModelZip: () => ipcRenderer.invoke("dialog:selectModelZip"),
});
