import { useState, useRef, useEffect } from "react";
import { autoCorrelate } from "../lib/audio-utils";
import { hzToNoteName } from "../lib/note-names";
import Meyda from "meyda";

// All scalar Meyda features we extract
const MEYDA_SCALAR_FEATURES = [
  "loudness",
  "zcr",
  "spectralFlatness",
  "spectralRolloff",
  "spectralSpread",
  "spectralKurtosis",
  "spectralSkewness",
  "perceptualSpread",
  "perceptualSharpness",
  "energy",
] as const;

const MEYDA_ALL_FEATURES = [
  ...MEYDA_SCALAR_FEATURES,
  "mfcc",
  "chroma",
  "rms",
  "spectralCentroid",
] as const;

export type MeydaScalarFeature = (typeof MEYDA_SCALAR_FEATURES)[number];

export interface MusicInfo {
  pitch: number;
  noteName: string;
  rms: number;
  centroid: number;
  // Meyda scalar features
  loudness: number;
  zcr: number;
  spectralFlatness: number;
  spectralRolloff: number;
  spectralSpread: number;
  spectralKurtosis: number;
  spectralSkewness: number;
  perceptualSpread: number;
  perceptualSharpness: number;
  energy: number;
  // Meyda array features
  mfcc: number[];
  chroma: number[];
}

const INITIAL_INFO: MusicInfo = {
  pitch: 0,
  noteName: "-",
  rms: 0,
  centroid: 0,
  loudness: 0,
  zcr: 0,
  spectralFlatness: 0,
  spectralRolloff: 0,
  spectralSpread: 0,
  spectralKurtosis: 0,
  spectralSkewness: 0,
  perceptualSpread: 0,
  perceptualSharpness: 0,
  energy: 0,
  mfcc: new Array(13).fill(0),
  chroma: new Array(12).fill(0),
};

// Default enabled features for OSC sending
export const DEFAULT_ENABLED_FEATURES = new Set<string>([
  "pitch",
  "note",
  "rms",
  "centroid",
]);

export { MEYDA_SCALAR_FEATURES };

export function useMusicInfo(
  analyserNode: AnalyserNode | null,
  audioContext: AudioContext | null,
  active: boolean,
  enabledFeatures: Set<string> = DEFAULT_ENABLED_FEATURES
) {
  const [info, setInfo] = useState<MusicInfo>(INITIAL_INFO);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!analyserNode || !audioContext || !active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const bufLen = analyserNode.fftSize;
    const floatBuf = new Float32Array(bufLen);
    const freqBuf = new Float32Array(analyserNode.frequencyBinCount);
    const sampleRate = audioContext.sampleRate;

    // Configure Meyda
    Meyda.sampleRate = sampleRate;
    Meyda.bufferSize = bufLen;
    Meyda.numberOfMFCCCoefficients = 13;

    function tick() {
      analyserNode!.getFloatTimeDomainData(floatBuf);
      analyserNode!.getFloatFrequencyData(freqBuf);

      // Pitch detection via autocorrelation (not in Meyda)
      const pitch = autoCorrelate(floatBuf, sampleRate);
      const noteName = pitch > 0 ? hzToNoteName(pitch) : "-";

      // Extract all Meyda features at once
      let meydaResult: Record<string, unknown> | null = null;
      try {
        meydaResult = Meyda.extract(MEYDA_ALL_FEATURES as unknown as string[], floatBuf) as Record<string, unknown>;
      } catch {
        // Meyda can fail on some buffer sizes
      }

      let rms = 0;
      let centroid = 0;
      let loudness = 0;
      let zcr = 0;
      let spectralFlatness = 0;
      let spectralRolloff = 0;
      let spectralSpread = 0;
      let spectralKurtosis = 0;
      let spectralSkewness = 0;
      let perceptualSpread = 0;
      let perceptualSharpness = 0;
      let energy = 0;
      let mfcc = INITIAL_INFO.mfcc;
      let chroma = INITIAL_INFO.chroma;

      if (meydaResult) {
        rms = (meydaResult.rms as number) || 0;
        centroid = (meydaResult.spectralCentroid as number) || 0;
        const loudnessObj = meydaResult.loudness as { total?: number } | undefined;
        loudness = loudnessObj?.total ?? 0;
        zcr = (meydaResult.zcr as number) || 0;
        spectralFlatness = (meydaResult.spectralFlatness as number) || 0;
        spectralRolloff = (meydaResult.spectralRolloff as number) || 0;
        spectralSpread = (meydaResult.spectralSpread as number) || 0;
        spectralKurtosis = (meydaResult.spectralKurtosis as number) || 0;
        spectralSkewness = (meydaResult.spectralSkewness as number) || 0;
        perceptualSpread = (meydaResult.perceptualSpread as number) || 0;
        perceptualSharpness = (meydaResult.perceptualSharpness as number) || 0;
        energy = (meydaResult.energy as number) || 0;
        if (Array.isArray(meydaResult.mfcc)) mfcc = meydaResult.mfcc as number[];
        if (Array.isArray(meydaResult.chroma)) chroma = meydaResult.chroma as number[];
      }

      const newInfo: MusicInfo = {
        pitch,
        noteName,
        rms,
        centroid,
        loudness,
        zcr,
        spectralFlatness,
        spectralRolloff,
        spectralSpread,
        spectralKurtosis,
        spectralSkewness,
        perceptualSpread,
        perceptualSharpness,
        energy,
        mfcc,
        chroma,
      };
      setInfo(newInfo);

      // Send OSC only for enabled features
      if (enabledFeatures.has("pitch")) window.api.sendOSCFloat("/music/pitch", pitch);
      if (enabledFeatures.has("note")) window.api.sendOSC("/music/note", [{ type: "s", value: noteName }]);
      if (enabledFeatures.has("rms")) window.api.sendOSCFloat("/music/rms", rms);
      if (enabledFeatures.has("centroid")) window.api.sendOSCFloat("/music/centroid", centroid);
      if (enabledFeatures.has("loudness")) window.api.sendOSCFloat("/music/loudness", loudness);
      if (enabledFeatures.has("zcr")) window.api.sendOSCFloat("/music/zcr", zcr);
      if (enabledFeatures.has("spectralFlatness")) window.api.sendOSCFloat("/music/flatness", spectralFlatness);
      if (enabledFeatures.has("spectralRolloff")) window.api.sendOSCFloat("/music/rolloff", spectralRolloff);
      if (enabledFeatures.has("spectralSpread")) window.api.sendOSCFloat("/music/spread", spectralSpread);
      if (enabledFeatures.has("spectralKurtosis")) window.api.sendOSCFloat("/music/kurtosis", spectralKurtosis);
      if (enabledFeatures.has("spectralSkewness")) window.api.sendOSCFloat("/music/skewness", spectralSkewness);
      if (enabledFeatures.has("perceptualSpread")) window.api.sendOSCFloat("/music/perceptualSpread", perceptualSpread);
      if (enabledFeatures.has("perceptualSharpness")) window.api.sendOSCFloat("/music/perceptualSharpness", perceptualSharpness);
      if (enabledFeatures.has("energy")) window.api.sendOSCFloat("/music/energy", energy);
      if (enabledFeatures.has("mfcc")) {
        for (let i = 0; i < mfcc.length; i++) {
          window.api.sendOSCFloat(`/music/mfcc/${i}`, mfcc[i] || 0);
        }
      }
      if (enabledFeatures.has("chroma")) {
        for (let i = 0; i < chroma.length; i++) {
          window.api.sendOSCFloat(`/music/chroma/${i}`, chroma[i] || 0);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode, audioContext, active, enabledFeatures]);

  return info;
}
