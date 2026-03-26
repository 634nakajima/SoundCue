import type { ClapResult } from "../../hooks/useClap";

interface Props {
  results: ClapResult[];
  labels: string;
  isRunning: boolean;
  ready: boolean;
  loading: boolean;
  error: string | null;
  downloadProgress: number;
  statusMessage: string;
  chunkSeconds: number;
  onSetLabels: (labels: string) => void;
  onStart: () => void;
  onStop: () => void;
  onSetChunkSeconds: (sec: number) => void;
}

const PRESETS: Record<string, string> = {
  "Environment": "clapping, laughter, footsteps, door closing, silence",
  "Music": "singing, guitar, piano, drums, bass, silence",
  "Nature": "birds chirping, rain, wind, thunder, water flowing",
  "Urban": "car horn, siren, construction, traffic, people talking",
};

export default function ClapTab({
  results,
  labels,
  isRunning,
  ready,
  loading,
  error,
  downloadProgress,
  statusMessage,
  chunkSeconds,
  onSetLabels,
  onStart,
  onStop,
  onSetChunkSeconds,
}: Props) {
  const maxScore = results.length > 0 ? Math.max(...results.map((r) => r.score)) : 0;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Labels input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400">Labels (comma-separated)</label>
        <input
          type="text"
          value={labels}
          onChange={(e) => onSetLabels(e.target.value)}
          disabled={isRunning}
          placeholder="clapping, music, speech, silence"
          className="bg-gray-800 text-gray-200 text-sm rounded px-3 py-2 border border-gray-700 disabled:opacity-50 font-mono"
        />
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => onSetLabels(preset)}
              disabled={isRunning}
              className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700 disabled:opacity-50 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={isRunning ? onStop : onStart}
          disabled={loading}
          className={`px-4 py-2 text-sm rounded font-medium ${
            loading
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : isRunning
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
        >
          {loading ? "Loading..." : isRunning ? "Stop" : ready ? "Start" : "Start (Load Model)"}
        </button>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400 whitespace-nowrap">Interval</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={chunkSeconds}
            onChange={(e) => onSetChunkSeconds(Number(e.target.value))}
            className="w-20 accent-blue-500 opacity-60"
          />
          <span className="text-xs text-gray-300 font-mono w-6 text-right">{chunkSeconds}s</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {isRunning && (
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Status */}
      <div className={`text-xs px-2 py-1.5 rounded ${
        error || statusMessage.includes("error")
          ? "text-red-400 bg-red-900/20"
          : statusMessage.includes("Classifying") || statusMessage.includes("ready")
          ? "text-green-400 bg-green-900/20"
          : statusMessage.includes("Downloading") || statusMessage.includes("Loading")
          ? "text-yellow-400 bg-yellow-900/20"
          : "text-gray-500 bg-gray-800/50"
      }`}>
        {error || statusMessage}
      </div>

      {/* Download progress bar */}
      {loading && downloadProgress > 0 && (
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}

      <div className="text-xs text-gray-600">
        Powered by CLAP (local, offline) — zero-shot audio classification with custom labels
      </div>

      {/* Results */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {results.length > 0 ? (
          results.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-28 truncate shrink-0 font-mono">
                {r.label}
              </span>
              <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    r.score === maxScore && r.score > 0.3
                      ? "bg-blue-500"
                      : "bg-gray-600"
                  }`}
                  style={{ width: `${Math.round(r.score * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-12 text-right font-mono shrink-0">
                {(r.score * 100).toFixed(1)}%
              </span>
            </div>
          ))
        ) : (
          <div className="text-gray-600 text-center py-8">
            {isRunning
              ? "Analyzing audio..."
              : ready
              ? "Press Start to begin classification"
              : "Press Start to load model and begin"}
          </div>
        )}
      </div>
    </div>
  );
}
