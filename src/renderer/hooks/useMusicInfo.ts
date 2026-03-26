import { useState, useRef, useEffect } from "react";
import { autoCorrelate } from "../lib/audio-utils";
import { hzToNoteName } from "../lib/note-names";

interface MusicInfo {
  pitch: number;
  noteName: string;
  rms: number;
  centroid: number;
}

export function useMusicInfo(
  analyserNode: AnalyserNode | null,
  audioContext: AudioContext | null,
  active: boolean
) {
  const [info, setInfo] = useState<MusicInfo>({
    pitch: 0,
    noteName: "-",
    rms: 0,
    centroid: 0,
  });

  const rafRef = useRef(0);
  const prevInfoRef = useRef(info);

  useEffect(() => {
    if (!analyserNode || !audioContext || !active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const bufLen = analyserNode.fftSize;
    const floatBuf = new Float32Array(bufLen);
    const freqBuf = new Float32Array(analyserNode.frequencyBinCount);
    const sampleRate = audioContext.sampleRate;

    function tick() {
      analyserNode!.getFloatTimeDomainData(floatBuf);
      analyserNode!.getFloatFrequencyData(freqBuf);

      // RMS
      let sumSq = 0;
      for (let i = 0; i < floatBuf.length; i++) {
        sumSq += floatBuf[i] * floatBuf[i];
      }
      const rms = Math.sqrt(sumSq / floatBuf.length);

      // Pitch detection via autocorrelation
      const pitch = autoCorrelate(floatBuf, sampleRate);
      const noteName = pitch > 0 ? hzToNoteName(pitch) : "-";

      // Spectral centroid
      let weightedSum = 0;
      let magnitudeSum = 0;
      const binWidth = sampleRate / (analyserNode!.fftSize);
      for (let i = 0; i < freqBuf.length; i++) {
        // Convert from dB to linear magnitude
        const mag = Math.pow(10, freqBuf[i] / 20);
        const freq = i * binWidth;
        weightedSum += freq * mag;
        magnitudeSum += mag;
      }
      const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

      const newInfo: MusicInfo = { pitch, noteName, rms, centroid };
      prevInfoRef.current = newInfo;
      setInfo(newInfo);

      // Send OSC
      window.api.sendOSCFloat("/music/pitch", pitch);
      window.api.sendOSC("/music/note", [{ type: "s", value: noteName }]);
      window.api.sendOSCFloat("/music/rms", rms);
      window.api.sendOSCFloat("/music/centroid", centroid);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode, audioContext, active]);

  return info;
}
