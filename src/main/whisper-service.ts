import { app } from "electron";
import { join } from "node:path";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

let whisperPipeline: any | null = null;
let loading = false;
let modelId = "onnx-community/whisper-small";

type ProgressCallback = (progress: { status: string; progress?: number; file?: string }) => void;

/**
 * On Windows, onnxruntime-node's native .node binding fails to load its DLLs.
 * Fix: redirect require('onnxruntime-node') → require('onnxruntime-web') (WASM, no native DLLs).
 *
 * Must run before @huggingface/transformers is loaded.
 * We use _require() (CJS) instead of await import() (ESM) for transformers, because:
 *   - CJS version uses require('onnxruntime-node') → interceptable via _resolveFilename
 *   - ESM version uses static `import * from "onnxruntime-node"` → not interceptable
 */
function patchOnnxRuntimeForWindows(): void {
  if (process.platform !== "win32") return;

  const NodeModule = _require("node:module") as any;
  if (NodeModule.__onnxPatchApplied) return;
  NodeModule.__onnxPatchApplied = true;

  const originalResolve = NodeModule._resolveFilename.bind(NodeModule);
  NodeModule._resolveFilename = function (
    request: string,
    parent: any,
    isMain: boolean,
    options: any
  ) {
    if (request === "onnxruntime-node") {
      return originalResolve("onnxruntime-web", parent, isMain, options);
    }
    return originalResolve(request, parent, isMain, options);
  };

  // Disable multi-threading: Electron main lacks SharedArrayBuffer (no COOP/COEP headers)
  const ort = _require("onnxruntime-web") as any;
  ort.env.wasm.numThreads = 1;
  console.log("[Whisper] Patched onnxruntime-node → onnxruntime-web (WASM)");
}

export async function initWhisper(
  model: string = "onnx-community/whisper-small",
  onProgress?: ProgressCallback
): Promise<void> {
  if (whisperPipeline || loading) return;
  loading = true;
  modelId = model;

  try {
    patchOnnxRuntimeForWindows();

    // Load via CJS require so Module._resolveFilename patch takes effect on Windows.
    // (ESM dynamic import() loads transformers.node.mjs which has static onnxruntime-node
    // imports that execute before any patch can intercept them.)
    const { pipeline, env } = _require("@huggingface/transformers") as any;

    const cacheDir = join(app.getPath("userData"), "models");
    env.cacheDir = cacheDir;
    env.allowLocalModels = false;
    console.log("[Whisper] Cache directory:", cacheDir);
    console.log("[Whisper] Loading model:", model);

    whisperPipeline = await pipeline(
      "automatic-speech-recognition",
      model,
      {
        dtype: "q4",          // quantized for speed
        device: "cpu",        // Use CPU (MPS not yet supported for whisper in transformers.js)
        progress_callback: onProgress
          ? (p: any) => {
              console.log("[Whisper] Progress:", p.status, p.file, p.progress);
              onProgress({
                status: p.status || "loading",
                progress: p.progress,
                file: p.file,
              });
            }
          : undefined,
      }
    );
    console.log("[Whisper] Model loaded successfully:", model);
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
