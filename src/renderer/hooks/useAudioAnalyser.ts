import { useState, useRef, useEffect, useCallback } from "react";

interface AudioAnalyserResult {
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  rmsLevel: number;
  timeDomainData: Uint8Array | null;
  frequencyData: Uint8Array | null;
}

export function useAudioAnalyser(stream: MediaStream | null): AudioAnalyserResult {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef(0);
  const timeDomainRef = useRef<Uint8Array | null>(null);
  const frequencyRef = useRef<Uint8Array | null>(null);

  const [rmsLevel, setRmsLevel] = useState(0);
  const [timeDomainData, setTimeDomainData] = useState<Uint8Array | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!stream) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;

    // Disconnect previous source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    const tdBuf = new Uint8Array(analyser.fftSize);
    const freqBuf = new Uint8Array(analyser.frequencyBinCount);
    timeDomainRef.current = tdBuf;
    frequencyRef.current = freqBuf;

    function tick() {
      analyser.getByteTimeDomainData(tdBuf);
      analyser.getByteFrequencyData(freqBuf);

      // Compute RMS from time domain (0-255 where 128 = silence)
      let sumSq = 0;
      for (let i = 0; i < tdBuf.length; i++) {
        const v = (tdBuf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / tdBuf.length);
      setRmsLevel(rms);
      setTimeDomainData(new Uint8Array(tdBuf));
      setFrequencyData(new Uint8Array(freqBuf));

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stream]);

  return {
    audioContext: ctxRef.current,
    analyserNode: analyserRef.current,
    rmsLevel,
    timeDomainData,
    frequencyData,
  };
}
