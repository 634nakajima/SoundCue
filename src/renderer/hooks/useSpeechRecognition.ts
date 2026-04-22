import { useState, useRef, useCallback, useEffect } from "react";

const WHISPER_LANGUAGES: Record<string, string> = {
  "ja-JP": "ja",
  "en-US": "en",
  "en-GB": "en",
  "zh-CN": "zh",
  "ko-KR": "ko",
  "fr-FR": "fr",
  "de-DE": "de",
  "es-ES": "es",
};

export function useSpeechRecognition(
  audioContext: AudioContext | null,
  stream: MediaStream | null,
  active: boolean
) {
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("ja-JP");
  const [statusMessage, setStatusMessage] = useState("Press Start to load Whisper model");
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelSize, setModelSize] = useState("small");
  const [chunkSeconds, setChunkSeconds] = useState(5);

  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const accumulatedRef = useRef<number[]>([]);
  const listeningRef = useRef(false);
  const chunkSecondsRef = useRef(chunkSeconds);

  // Keep ref in sync with state so onaudioprocess reads latest value
  useEffect(() => {
    chunkSecondsRef.current = chunkSeconds;
  }, [chunkSeconds]);

  // Listen for model download progress
  useEffect(() => {
    window.api.onWhisperProgress((progress) => {
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
      window.api.removeWhisperProgressListener();
    };
  }, []);

  // Check model status on mount
  useEffect(() => {
    window.api.whisperStatus().then((status) => {
      setModelReady(status.ready);
      setModelLoading(status.loading);
      if (status.ready) {
        setStatusMessage("Whisper ready — press Start");
      }
    });
  }, []);

  const start = useCallback(async () => {
    if (!audioContext || !stream) {
      setStatusMessage("No audio input available");
      return;
    }

    // Load model if not ready
    if (!modelReady) {
      setModelLoading(true);
      const MODEL_MAP: Record<string, { id: string; size: string }> = {
        tiny:   { id: "onnx-community/whisper-tiny",   size: "~75MB" },
        small:  { id: "onnx-community/whisper-small",  size: "~250MB" },
        medium: { id: "onnx-community/whisper-medium", size: "~800MB" },
      };
      const modelInfo = MODEL_MAP[modelSize] || MODEL_MAP.small;
      setStatusMessage(`Loading Whisper ${modelSize} (first time downloads ${modelInfo.size})...`);
      const result = await window.api.whisperInit(modelInfo.id);
      setModelLoading(false);
      if (!result.success) {
        setStatusMessage(`Model load error: ${result.error}`);
        return;
      }
      setModelReady(true);
      setStatusMessage(`Whisper ${modelSize} ready`);
    }

    // Start capturing audio
    listeningRef.current = true;
    setIsListening(true);
    setStatusMessage("Listening...");
    accumulatedRef.current = [];

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    sourceRef.current = source;
    processorRef.current = processor;

    const sampleRate = audioContext.sampleRate;
    const TARGET_RATE = 16000;

    processor.onaudioprocess = (e) => {
      if (!listeningRef.current) return;
      const input = e.inputBuffer.getChannelData(0);

      // Resample to 16kHz
      const ratio = TARGET_RATE / sampleRate;
      for (let i = 0; i < Math.floor(input.length * ratio); i++) {
        const srcIdx = i / ratio;
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, input.length - 1);
        const frac = srcIdx - lo;
        accumulatedRef.current.push(input[lo] * (1 - frac) + input[hi] * frac);
      }

      // When we have enough audio, transcribe
      const samplesNeeded = TARGET_RATE * chunkSecondsRef.current;
      if (accumulatedRef.current.length >= samplesNeeded) {
        const chunk = accumulatedRef.current.slice(0, samplesNeeded);
        accumulatedRef.current = accumulatedRef.current.slice(samplesNeeded); // No overlap

        // Silence gate: skip if audio is too quiet (prevents Whisper hallucination)
        let sumSq = 0;
        for (let j = 0; j < chunk.length; j++) {
          sumSq += chunk[j] * chunk[j];
        }
        const rms = Math.sqrt(sumSq / chunk.length);
        if (rms < 0.01) {
          // Too quiet — skip transcription to avoid hallucinations like "ご視聴ありがとうございました"
          setInterimText("");
          setStatusMessage("Listening... (silence)");
          return;
        }

        setInterimText("Transcribing...");
        const lang = WHISPER_LANGUAGES[language] || "ja";

        window.api.whisperTranscribe(chunk, lang).then((result) => {
          if (result.success && result.text) {
            const text = result.text.trim();

            // Filter out known Whisper hallucinations
            const HALLUCINATIONS = [
              "ご視聴ありがとうございました",
              "ありがとうございました",
              "チャンネル登録よろしくお願いします",
              "Thanks for watching",
              "Thank you for watching",
              "Subscribe to my channel",
              "Please subscribe",
              "字幕は自動生成されています",
            ];
            const isHallucination = HALLUCINATIONS.some(
              (h) => text === h || text.replace(/[。、！？\s]/g, "") === h.replace(/[。、！？\s]/g, "")
            );

            if (text && !isHallucination) {
              setTranscript((prev) => prev + text + "\n");
              setConfidence(1.0);
              setStatusMessage("Listening...");

              // Send OSC
              window.api.sendOSC("/speech/text", [{ type: "s", value: text }]);
              window.api.sendOSCFloat("/speech/confidence", 1.0);
            } else {
              setStatusMessage("Listening...");
            }
          } else if (result.error) {
            console.warn("[Whisper] Transcribe error:", result.error);
          }
          if (listeningRef.current) {
            setInterimText("");
          }
        });
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, [audioContext, stream, language, modelReady]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    setInterimText("");
    setStatusMessage(modelReady ? "Stopped — press Start to resume" : "Press Start to load Whisper model");

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    accumulatedRef.current = [];
  }, [modelReady]);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (processorRef.current) processorRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
    };
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimText("");
  }, []);

  // When model size changes, reset model so it reloads on next Start
  const changeModelSize = useCallback((size: string) => {
    if (size !== modelSize) {
      setModelSize(size);
      setModelReady(false);
      setStatusMessage(`Model changed to ${size} — press Start to load`);
    }
  }, [modelSize]);

  return {
    transcript,
    interimText,
    confidence,
    isListening,
    language,
    setLanguage,
    start,
    stop,
    clearTranscript,
    statusMessage,
    apiAvailable: true,
    modelReady,
    modelSize,
    changeModelSize,
    modelLoading,
    downloadProgress,
    chunkSeconds,
    setChunkSeconds,
  };
}
