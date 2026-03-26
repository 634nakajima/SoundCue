import { useState, useRef, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";

export interface TMResult {
  label: string;
  score: number;
}

interface TMMetadata {
  wordLabels?: string[];
  labels?: string[];
}

export function useTeachableMachine(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
  active: boolean
) {
  const [classes, setClasses] = useState<TMResult[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState("");
  const modelRef = useRef<tf.LayersModel | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const loadModel = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setReady(false);

    try {
      // Teachable Machine audio model: url/model.json + url/metadata.json
      const metaUrl = url.endsWith("/") ? url + "metadata.json" : url + "/metadata.json";
      const modelUrl = url.endsWith("/") ? url + "model.json" : url + "/model.json";

      const metaResp = await fetch(metaUrl);
      const meta: TMMetadata = await metaResp.json();
      const classLabels = meta.wordLabels || meta.labels || [];
      setLabels(classLabels);

      const model = await tf.loadLayersModel(modelUrl);
      modelRef.current = model;
      setModelUrl(url);
      setReady(true);
    } catch (e: any) {
      console.error("[TM] Load error:", e);
      setError(`Failed to load model: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Classification loop
  useEffect(() => {
    if (!active || !ready || !audioContext || !stream || !modelRef.current) return;

    const model = modelRef.current;
    const sourceRate = audioContext.sampleRate;
    const SAMPLE_RATE = 44100;
    const SPEC_HOP = 229;
    let accumulatedSamples: number[] = [];
    let running = true;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!running || !modelRef.current) return;
      const input = e.inputBuffer.getChannelData(0);

      // Accumulate raw samples
      for (let i = 0; i < input.length; i++) {
        accumulatedSamples.push(input[i]);
      }

      // TM audio models expect a spectrogram input.
      // We need enough samples to compute a spectrogram frame.
      // For simplicity, classify every ~1 second
      const neededSamples = sourceRate; // 1 second
      if (accumulatedSamples.length >= neededSamples) {
        const samples = new Float32Array(accumulatedSamples.slice(0, neededSamples));
        accumulatedSamples = accumulatedSamples.slice(Math.floor(neededSamples / 2)); // 50% overlap

        tf.tidy(() => {
          try {
            // Get model input shape to determine what format it expects
            const inputShape = model.inputs[0].shape;

            // Simple approach: compute a basic spectrogram
            // Most TM audio models expect shape [1, timeSteps, freqBins, 1]
            // We'll create a simplified spectrogram
            const fftSize = 1024;
            const hopSize = SPEC_HOP;
            const numFrames = Math.floor((samples.length - fftSize) / hopSize) + 1;
            const numBins = fftSize / 2 + 1;

            // For now, feed raw audio reshaped to match model input
            // TM models vary in input format - this is a best-effort approach
            const inputTensor = tf.tensor(samples).reshape(inputShape as number[]);
            const prediction = model.predict(inputTensor) as tf.Tensor;
            const scores = prediction.dataSync() as Float32Array;

            const results: TMResult[] = [];
            for (let i = 0; i < scores.length; i++) {
              results.push({
                label: labels[i] || `Class ${i}`,
                score: scores[i],
              });
            }
            results.sort((a, b) => b.score - a.score);
            setClasses(results);

            // Send OSC
            if (results.length > 0) {
              window.api.sendOSC("/tm/class", [{ type: "s", value: results[0].label }]);
              window.api.sendOSCFloat("/tm/confidence", results[0].score);
              for (let i = 0; i < results.length; i++) {
                window.api.sendOSCFloat(`/tm/prob/${i}`, results[i].score);
              }
            }
          } catch (err) {
            // Input shape mismatch is expected until proper preprocessing is set up
            console.warn("[TM] Inference error:", err);
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
      processorRef.current = null;
    };
  }, [active, ready, audioContext, stream, labels]);

  return { classes, labels, ready, loading, error, loadModel, modelUrl };
}
