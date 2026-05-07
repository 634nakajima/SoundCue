import { app } from "electron";
import { join } from "node:path";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

let clapPipeline: any | null = null;
let loading = false;

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
  console.log("[CLAP] Patched onnxruntime-node → onnxruntime-web (WASM)");
}

export async function initClap(onProgress?: ProgressCallback): Promise<void> {
  if (clapPipeline || loading) return;
  loading = true;

  try {
    patchOnnxRuntimeForWindows();

    // Load via CJS require so Module._resolveFilename patch takes effect on Windows.
    // (ESM dynamic import() loads transformers.node.mjs which has static onnxruntime-node
    // imports that execute before any patch can intercept them.)
    const { pipeline, env } = _require("@huggingface/transformers") as any;

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
