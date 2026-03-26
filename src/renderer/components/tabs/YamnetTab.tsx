import ConfidenceBars from "../ConfidenceBars";
import WaveformDisplay from "../WaveformDisplay";
import { type YamnetResult } from "../../hooks/useYamnet";

interface Props {
  topClasses: YamnetResult[];
  ready: boolean;
  loading: boolean;
  error: string | null;
  timeDomainData: Uint8Array | null;
}

export default function YamnetTab({ topClasses, ready, loading, error, timeDomainData }: Props) {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            ready ? "bg-green-500" : loading ? "bg-yellow-500 animate-pulse" : "bg-gray-600"
          }`}
        />
        <span className="text-sm text-gray-400">
          {loading
            ? "Loading YAMNet model..."
            : ready
            ? "YAMNet ready — 521 sound categories"
            : error || "Waiting to start..."}
        </span>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded p-2">{error}</div>
      )}

      {/* Waveform */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Waveform</label>
        <WaveformDisplay data={timeDomainData} height={80} />
      </div>

      {/* Classification Results */}
      <div className="flex-1">
        <label className="text-xs text-gray-500 mb-2 block">Classification Results</label>
        <ConfidenceBars
          items={topClasses.map((c) => ({ label: c.label, confidence: c.score }))}
          maxItems={10}
        />
      </div>
    </div>
  );
}
