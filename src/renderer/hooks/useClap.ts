import { useState, useRef, useCallback, useEffect } from "react";

export interface ClapResult {
  label: string;
  score: number;
}

export function useClap(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
  active: boolean
) {
  const [results, setResults] = useState<ClapResult[]>([]);
  const [labels, setLabels] = useState("clapping, music, speech, noise");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Press Start to load CLAP model");
  const [isRunning, setIsRunning] = useState(false);
  const [chunkSeconds, setChunkSeconds] = useState(2);

  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const accumulatedRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const chunkSecondsRef = useRef(chunkSeconds);
  const labelsRef = useRef(labels);
  const classifyingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    chunkSecondsRef.current = chunkSeconds;
  }, [chunkSeconds]);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  // Listen for model download progress
  useEffect(() => {
    window.api.onClapProgress((progress) => {
      if (progress.status === "progress" && progress.progress !== undefined) {
        setDownloadProgress(Math.round(progress.progress));
        setStatusMessage(`Downloading model... ${Math.round(progress.progress)}%`);
      } else if (progress.status === "done") {
        setStatusMessage("Model loaded");
      } else if (progress.status === "initiate" && progress.file) {
        setStatusMessage(`Downloading: ${progress.file}`);
      }
    });
    return () => {
      window.api.removeClapProgressListener();
    };
  }, []);

  // Check model status on mount
  useEffect(() => {
    window.api.clapStatus().then((status) => {
      setReady(status.ready);
      setLoading(status.loading);
      if (status.ready) {
        setStatusMessage("CLAP ready — press Start");
      }
    });
  }, []);

  const start = useCallback(async () => {
    if (!audioContext || !stream) {
      setStatusMessage("No audio input available");
      return;
    }

    // Load model if not ready
    if (!ready) {
      setLoading(true);
      setStatusMessage("Loading CLAP model (~170MB first time)...");
      const result = await window.api.clapInit();
      setLoading(false);
      if (!result.success) {
        setError(result.error || "Failed to load model");
        setStatusMessage(`Model load error: ${result.error}`);
        return;
      }
      setReady(true);
      setStatusMessage("CLAP ready");
    }

    // Parse labels
    const labelList = labelsRef.current
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (labelList.length < 2) {
      setStatusMessage("Enter at least 2 labels (comma-separated)");
      return;
    }

    // Start capturing audio
    runningRef.current = true;
    setIsRunning(true);
    setStatusMessage("Classifying...");
    accumulatedRef.current = [];

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    sourceRef.current = source;
    processorRef.current = processor;

    const sampleRate = audioContext.sampleRate;
    const TARGET_RATE = 48000; // CLAP expects 48kHz

    processor.onaudioprocess = (e) => {
      if (!runningRef.current) return;
      const input = e.inputBuffer.getChannelData(0);

      // Resample to 48kHz
      const ratio = TARGET_RATE / sampleRate;
      for (let i = 0; i < Math.floor(input.length * ratio); i++) {
        const srcIdx = i / ratio;
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, input.length - 1);
        const frac = srcIdx - lo;
        accumulatedRef.current.push(input[lo] * (1 - frac) + input[hi] * frac);
      }

      const samplesNeeded = TARGET_RATE * chunkSecondsRef.current;
      if (accumulatedRef.current.length >= samplesNeeded && !classifyingRef.current) {
        const chunk = accumulatedRef.current.slice(0, samplesNeeded);
        accumulatedRef.current = accumulatedRef.current.slice(samplesNeeded);

        // Silence gate
        let sumSq = 0;
        for (let j = 0; j < chunk.length; j++) {
          sumSq += chunk[j] * chunk[j];
        }
        const rms = Math.sqrt(sumSq / chunk.length);
        if (rms < 0.005) {
          setResults([]);
          return;
        }

        const currentLabels = labelsRef.current
          .split(",")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (currentLabels.length < 2) return;

        classifyingRef.current = true;
        window.api.clapClassify(chunk, currentLabels).then((result) => {
          classifyingRef.current = false;
          if (result.success && result.results) {
            // Sort by score descending
            const sorted = result.results.sort((a, b) => b.score - a.score);
            setResults(sorted);

            // Send OSC
            if (sorted.length > 0) {
              window.api.sendOSC("/clap/class", [{ type: "s", value: sorted[0].label }]);
              window.api.sendOSCFloat("/clap/confidence", sorted[0].score);
              sorted.forEach((r, i) => {
                window.api.sendOSCFloat(`/clap/prob/${i}`, r.score);
              });
            }
          } else if (result.error) {
            console.warn("[CLAP] Classify error:", result.error);
          }
        });
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [audioContext, stream, ready]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    setStatusMessage(ready ? "Stopped — press Start to resume" : "Press Start to load CLAP model");

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    accumulatedRef.current = [];
  }, [ready]);

  // Stop when tab becomes inactive
  useEffect(() => {
    if (!active && isRunning) {
      stop();
    }
  }, [active, isRunning, stop]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (processorRef.current) processorRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
    };
  }, []);

  return {
    results,
    labels,
    setLabels,
    ready,
    loading,
    error,
    downloadProgress,
    statusMessage,
    isRunning,
    start,
    stop,
    chunkSeconds,
    setChunkSeconds,
  };
}
