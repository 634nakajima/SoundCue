interface OSCArg {
  type: "f" | "i" | "s";
  value: number | string;
}

interface Window {
  api: {
    sendOSC: (address: string, args: OSCArg[]) => void;
    sendOSCFloat: (address: string, value: number) => void;
    getSendStatus: () => Promise<{
      destHost: string;
      destPort: number;
      enabled: boolean;
      messageCount: number;
    }>;
    getReceiveStatus: () => Promise<{ port: number; active: boolean }>;
    updateSendConfig: (host: string, port: number) => Promise<any>;
    updateReceivePort: (port: number) => Promise<any>;
    setSendEnabled: (enabled: boolean) => Promise<any>;
    onConfigChanged: (callback: (address: string, value: number) => void) => void;
    removeConfigListener: () => void;
    onOscSent: (callback: (address: string, value: string) => void) => void;
    removeOscSentListener: () => void;
    whisperInit: (model?: string) => Promise<{ success: boolean; error?: string }>;
    whisperTranscribe: (audioData: number[], language: string) => Promise<{
      success: boolean;
      text?: string;
      chunks?: Array<{ text: string; timestamp: [number, number] }>;
      error?: string;
    }>;
    whisperStatus: () => Promise<{ ready: boolean; loading: boolean; model: string }>;
    onWhisperProgress: (callback: (progress: { status: string; progress?: number; file?: string }) => void) => void;
    removeWhisperProgressListener: () => void;
    clapInit: () => Promise<{ success: boolean; error?: string }>;
    clapClassify: (audioData: number[], labels: string[]) => Promise<{
      success: boolean;
      results?: Array<{ label: string; score: number }>;
      error?: string;
    }>;
    clapStatus: () => Promise<{ ready: boolean; loading: boolean }>;
    onClapProgress: (callback: (progress: { status: string; progress?: number; file?: string }) => void) => void;
    removeClapProgressListener: () => void;
    selectModelZip: () => Promise<string | null>;
  };
}
