import { app } from "electron";
import { join } from "node:path";

let clapPipeline: any | null = null;
let loading = false;

type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

function addOnnxRuntimeToPath(): void {
  if (process.platform !== "win32") return;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const onnxDir = app.isPackaged
    ? join(process.resourcesPath, "app.asar.unpacked", "node_modules", "onnxruntime-node", "bin", "napi-v3", "win32", arch)
    : join(__dirname, "../..", "node_modules", "onnxruntime-node", "bin", "napi-v3", "win32", arch);
  if (!process.env.PATH?.includes(onnxDir)) {
    process.env.PATH = `${onnxDir};${process.env.PATH ?? ""}`;
  }
}

export async function initClap(onProgress?: ProgressCallback): Promise<void> {
  if (clapPipeline || loading) return;
  loading = true;

  try {
    addOnnxRuntimeToPath();
    const { pipeline, env } = await import("@huggingface/transformers");

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
    )) as any;
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
