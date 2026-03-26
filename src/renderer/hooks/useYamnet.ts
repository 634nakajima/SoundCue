import { useState, useRef, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import { YAMNET_LABELS } from "../lib/yamnet-labels";

export interface YamnetResult {
  label: string;
  score: number;
}

const MODEL_URL = "https://www.kaggle.com/models/google/yamnet/TfJs/tfjs/1";

export function useYamnet(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
  active: boolean,
  topN: number = 5
) {
  const [topClasses, setTopClasses] = useState<YamnetResult[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<tf.GraphModel | null>(null);
  const intervalRef = useRef<number>(0);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(0));
  const SAMPLE_RATE = 16000;
  const BUFFER_SIZE = 15600; // ~0.975s at 16kHz

  // Load model
  useEffect(() => {
    if (!active || modelRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const model = await tf.loadGraphModel(MODEL_URL, { fromTFHub: true });
        if (cancelled) return;
        modelRef.current = model;
        setReady(true);
      } catch (e: any) {
        if (!cancelled) {
          console.error("[YAMNet] Model load error:", e);
          setError(`Failed to load YAMNet model: ${e.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active]);

  // Audio capture + classification loop
  useEffect(() => {
    if (!active || !ready || !audioContext || !stream || !modelRef.current) return;

    const model = modelRef.current;
    const sourceRate = audioContext.sampleRate;
    let accumulatedSamples: number[] = [];
    let running = true;

    // Use ScriptProcessorNode as fallback (simpler than AudioWorklet for cross-platform)
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!running) return;
      const input = e.inputBuffer.getChannelData(0);

      // Resample to 16kHz
      const ratio = SAMPLE_RATE / sourceRate;
      for (let i = 0; i < input.length * ratio; i++) {
        const srcIdx = i / ratio;
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, input.length - 1);
        const frac = srcIdx - lo;
        accumulatedSamples.push(input[lo] * (1 - frac) + input[hi] * frac);
      }

      // When we have enough samples, run inference
      if (accumulatedSamples.length >= BUFFER_SIZE) {
        const samples = new Float32Array(accumulatedSamples.slice(0, BUFFER_SIZE));
        accumulatedSamples = accumulatedSamples.slice(BUFFER_SIZE);

        // Run model
        tf.tidy(() => {
          const inputTensor = tf.tensor1d(samples);
          const result = model.predict(inputTensor);

          // YAMNet outputs: [scores, embeddings, spectrogram]
          let scoresTensor: tf.Tensor;
          if (Array.isArray(result)) {
            scoresTensor = result[0];
          } else {
            scoresTensor = result as tf.Tensor;
          }

          const scores = scoresTensor.dataSync() as Float32Array;

          // Get top N
          const indexed = Array.from(scores).map((s, i) => ({ score: s, index: i }));
          indexed.sort((a, b) => b.score - a.score);
          const top = indexed.slice(0, topN).map((item) => ({
            label: YAMNET_LABELS[item.index] || `Class ${item.index}`,
            score: item.score,
          }));

          setTopClasses(top);

          // Send OSC
          if (top.length > 0) {
            window.api.sendOSC("/yamnet/class", [{ type: "s", value: top[0].label }]);
            window.api.sendOSCFloat("/yamnet/confidence", top[0].score);
            for (let i = 0; i < top.length; i++) {
              window.api.sendOSCFloat(`/yamnet/prob/${i}`, top[i].score);
            }
          }
        });
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    return () => {
      running = false;
      processor.disconnect();
      source.disconnect();
    };
  }, [active, ready, audioContext, stream, topN]);

  return { topClasses, ready, loading, error };
}
