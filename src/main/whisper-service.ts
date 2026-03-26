import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let whisperPipeline: AutomaticSpeechRecognitionPipeline | null = null;
let loading = false;
let modelId = "onnx-community/whisper-small";

type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

export async function initWhisper(
  model: string = "onnx-community/whisper-small",
  onProgress?: ProgressCallback
): Promise<void> {
  if (whisperPipeline || loading) return;
  loading = true;
  modelId = model;

  try {
    whisperPipeline = await pipeline(
      "automatic-speech-recognition",
      model,
      {
        dtype: "q4",          // quantized for speed
        device: "cpu",        // Use CPU (MPS not yet supported for whisper in transformers.js)
        progress_callback: onProgress
          ? (p: any) => onProgress({
              status: p.status || "loading",
              progress: p.progress,
              file: p.file,
            })
          : undefined,
      }
    );
    console.log("[Whisper] Model loaded:", model);
  } catch (e) {
    console.error("[Whisper] Failed to load model:", e);
    throw e;
  } finally {
    loading = false;
  }
}

export async function transcribe(
  audioData: Float32Array,
  language: string = "ja"
): Promise<{ text: string; chunks?: Array<{ text: string; timestamp: [number, number] }> }> {
  if (!whisperPipeline) {
    throw new Error("Whisper model not loaded");
  }

  const result = await whisperPipeline(audioData, {
    language,
    task: "transcribe",
    return_timestamps: true,
  });

  return result as any;
}

export function isReady(): boolean {
  return whisperPipeline !== null;
}

export function isLoading(): boolean {
  return loading;
}

export function getModelId(): string {
  return modelId;
}
