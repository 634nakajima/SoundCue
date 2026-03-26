import { pipeline, env, type ZeroShotAudioClassificationPipeline } from "@huggingface/transformers";
import { app } from "electron";
import { join } from "node:path";

let clapPipeline: ZeroShotAudioClassificationPipeline | null = null;
let loading = false;

type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

export async function initClap(onProgress?: ProgressCallback): Promise<void> {
  if (clapPipeline || loading) return;
  loading = true;

  try {
    const cacheDir = join(app.getPath("userData"), "models");
    env.cacheDir = cacheDir;
    env.allowLocalModels = false;
    console.log("[CLAP] Cache directory:", cacheDir);
    console.log("[CLAP] Loading model: Xenova/clap-htsat-unfused");

    clapPipeline = (await pipeline(
      "zero-shot-audio-classification",
      "Xenova/clap-htsat-unfused",
      {
        dtype: "fp32",
        device: "cpu",
        progress_callback: onProgress
          ? (p: any) => {
              console.log("[CLAP] Progress:", p.status, p.file, p.progress);
              onProgress({
                status: p.status || "loading",
                progress: p.progress,
                file: p.file,
              });
            }
          : undefined,
      }
    )) as ZeroShotAudioClassificationPipeline;
    console.log("[CLAP] Model loaded successfully");
  } catch (e) {
    console.error("[CLAP] Failed to load model:", e);
    throw e;
  } finally {
    loading = false;
  }
}

export async function classify(
  audioData: Float32Array,
  labels: string[]
): Promise<Array<{ label: string; score: number }>> {
  if (!clapPipeline) {
    throw new Error("CLAP model not loaded");
  }

  const result = await clapPipeline(audioData, labels, {
    hypothesis_template: "This is a sound of {}.",
  });

  return (result as any[]).map((r: any) => ({
    label: r.label,
    score: r.score,
  }));
}

export function isReady(): boolean {
  return clapPipeline !== null;
}

export function isLoading(): boolean {
  return loading;
}
