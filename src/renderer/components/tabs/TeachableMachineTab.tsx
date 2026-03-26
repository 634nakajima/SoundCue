import { useState } from "react";
import ConfidenceBars from "../ConfidenceBars";
import { type TMResult } from "../../hooks/useTeachableMachine";

interface Props {
  classes: TMResult[];
  labels: string[];
  ready: boolean;
  loading: boolean;
  error: string | null;
  modelUrl: string;
  onLoadModel: (url: string) => void;
}

export default function TeachableMachineTab({
  classes,
  labels,
  ready,
  loading,
  error,
  modelUrl,
  onLoadModel,
}: Props) {
  const [urlInput, setUrlInput] = useState("");

  const handleLoad = () => {
    if (urlInput.trim()) {
      onLoadModel(urlInput.trim());
    }
  };

  const handleLoadZip = async () => {
    const path = await window.api.selectModelZip();
    if (path) {
      onLoadModel(`file://${path}`);
    }
  };

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
            ? "Loading model..."
            : ready
            ? `Model loaded — ${labels.length} classes`
            : "Load a Teachable Machine audio model"}
        </span>
      </div>

      {/* Model URL input */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Model URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://teachablemachine.withgoogle.com/models/..."
            className="flex-1 bg-gray-800 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          <button
            onClick={handleLoad}
            disabled={loading || !urlInput.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded"
          >
            Load
          </button>
        </div>
        <button
          onClick={handleLoadZip}
          disabled={loading}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
        >
          Or load from ZIP file...
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded p-2">{error}</div>
      )}

      {/* Results */}
      <div className="flex-1">
        <label className="text-xs text-gray-500 mb-2 block">Classification Results</label>
        <ConfidenceBars
          items={classes.map((c) => ({ label: c.label, confidence: c.score }))}
        />
      </div>
    </div>
  );
}
