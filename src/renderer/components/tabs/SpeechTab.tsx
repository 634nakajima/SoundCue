interface Props {
  transcript: string;
  interimText: string;
  confidence: number;
  isListening: boolean;
  language: string;
  statusMessage: string;
  apiAvailable: boolean;
  modelReady?: boolean;
  modelLoading?: boolean;
  downloadProgress?: number;
  modelSize?: string;
  chunkSeconds?: number;
  onSetLanguage: (lang: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onChangeModelSize?: (size: string) => void;
  onSetChunkSeconds?: (sec: number) => void;
}

const LANGUAGES = [
  { code: "ja-JP", label: "日本語" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "ko-KR", label: "한국어" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "es-ES", label: "Español" },
];

export default function SpeechTab({
  transcript,
  interimText,
  confidence,
  isListening,
  language,
  statusMessage,
  apiAvailable,
  modelReady,
  modelLoading,
  downloadProgress,
  modelSize,
  onSetLanguage,
  onStart,
  onStop,
  onClear,
  onChangeModelSize,
  chunkSeconds,
  onSetChunkSeconds,
}: Props) {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={isListening ? onStop : onStart}
          disabled={modelLoading}
          className={`px-4 py-2 text-sm rounded font-medium ${
            modelLoading
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : isListening
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
        >
          {modelLoading ? "Loading..." : isListening ? "Stop" : modelReady ? "Start" : "Start (Load Model)"}
        </button>

        <select
          value={language}
          onChange={(e) => onSetLanguage(e.target.value)}
          disabled={isListening}
          className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-2 border border-gray-700 disabled:opacity-50"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          value={modelSize || "small"}
          onChange={(e) => onChangeModelSize?.(e.target.value)}
          disabled={isListening || modelLoading}
          className="bg-gray-800 text-gray-200 text-sm rounded px-2 py-2 border border-gray-700 disabled:opacity-50"
        >
          <option value="tiny">tiny (~75MB, fast)</option>
          <option value="small">small (~250MB)</option>
          <option value="medium">medium (~800MB, accurate)</option>
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400 whitespace-nowrap">Interval</label>
          <input
            type="range"
            min={2}
            max={15}
            step={1}
            value={chunkSeconds ?? 5}
            onChange={(e) => onSetChunkSeconds?.(Number(e.target.value))}
            className="w-20 accent-blue-500"
          />
          <span className="text-xs text-gray-300 font-mono w-6 text-right">{chunkSeconds ?? 5}s</span>
        </div>

        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          Clear
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {isListening && (
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          {confidence > 0 && (
            <span className="text-xs text-gray-500 font-mono">
              {(confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Status message */}
      <div className={`text-xs px-2 py-1.5 rounded ${
        statusMessage.includes("Error") || statusMessage.includes("error")
          ? "text-red-400 bg-red-900/20"
          : statusMessage.includes("Listening") || statusMessage.includes("ready")
          ? "text-green-400 bg-green-900/20"
          : statusMessage.includes("Downloading") || statusMessage.includes("Loading")
          ? "text-yellow-400 bg-yellow-900/20"
          : "text-gray-500 bg-gray-800/50"
      }`}>
        {statusMessage}
      </div>

      {/* Download progress bar */}
      {modelLoading && downloadProgress > 0 && (
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}

      <div className="text-xs text-gray-600">
        Powered by Whisper (local, offline) — larger models are slower but more accurate in noisy environments
      </div>

      {/* Transcript */}
      <div className="flex-1 bg-gray-900 rounded border border-gray-700 p-3 overflow-y-auto font-mono text-sm">
        <div className="text-gray-200 whitespace-pre-wrap">{transcript}</div>
        {interimText && (
          <span className="text-blue-400 italic">{interimText}</span>
        )}
        {!transcript && !interimText && (
          <div className="text-gray-600 text-center py-8">
            {isListening
              ? `Speak now... (transcribes every ${chunkSeconds ?? 5} seconds)`
              : modelReady
              ? "Press Start to begin recognition"
              : "Press Start to load model and begin"}
          </div>
        )}
      </div>
    </div>
  );
}
