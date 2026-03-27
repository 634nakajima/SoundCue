import { useState } from "react";
import WaveformDisplay from "../WaveformDisplay";
import SpectrumDisplay from "../SpectrumDisplay";
import type { MusicInfo } from "../../hooks/useMusicInfo";
import { MEYDA_SCALAR_FEATURES, type MeydaScalarFeature } from "../../hooks/useMusicInfo";

interface Props {
  info: MusicInfo;
  enabledFeatures: Set<string>;
  onToggleFeature: (key: string) => void;
  timeDomainData: Uint8Array | null;
  frequencyData: Uint8Array | null;
}

const CHROMA_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Feature descriptions for the reference modal
const FEATURE_REFERENCE: Record<string, { name: string; osc: string; desc_ja: string; desc_en: string; range: string }> = {
  pitch: { name: "Pitch", osc: "/music/pitch", desc_ja: "自己相関法によるピッチ検出（Hz）", desc_en: "Pitch detection via autocorrelation (Hz)", range: "0 - ~4000 Hz" },
  note: { name: "Note Name", osc: "/music/note", desc_ja: "ピッチから変換した音名（例: A4）", desc_en: "Note name derived from pitch (e.g. A4)", range: "C0 - B8" },
  rms: { name: "RMS Level", osc: "/music/rms", desc_ja: "二乗平均平方根（音量の指標）", desc_en: "Root mean square level (loudness indicator)", range: "0 - 1" },
  centroid: { name: "Spectral Centroid", osc: "/music/centroid", desc_ja: "スペクトルの重心周波数。音の「明るさ」の指標", desc_en: "Center of mass of the spectrum. Indicates brightness", range: "0 - 20000 Hz" },
  loudness: { name: "Loudness", osc: "/music/loudness", desc_ja: "知覚的な音の大きさ（Bark帯域ベース）", desc_en: "Perceptual loudness based on Bark bands", range: "0+" },
  zcr: { name: "Zero Crossing Rate", osc: "/music/zcr", desc_ja: "波形がゼロを横切る頻度。ノイズ/打楽器の検出に有用", desc_en: "Rate of sign changes in the signal. Useful for noise/percussion detection", range: "0+" },
  spectralFlatness: { name: "Spectral Flatness", osc: "/music/flatness", desc_ja: "スペクトルの平坦度。0=調性音、1=ホワイトノイズ", desc_en: "Flatness of spectrum. 0=tonal, 1=white noise", range: "0 - 1" },
  spectralRolloff: { name: "Spectral Rolloff", osc: "/music/rolloff", desc_ja: "エネルギーの85%が集中する周波数", desc_en: "Frequency below which 85% of spectral energy lies", range: "0 - 20000 Hz" },
  spectralSpread: { name: "Spectral Spread", osc: "/music/spread", desc_ja: "スペクトルの広がり度合い", desc_en: "Spread of the spectrum around its centroid", range: "0+" },
  spectralKurtosis: { name: "Spectral Kurtosis", osc: "/music/kurtosis", desc_ja: "スペクトルの尖度。ピーキーさの指標", desc_en: "Peakedness of the spectrum distribution", range: "-∞ - +∞" },
  spectralSkewness: { name: "Spectral Skewness", osc: "/music/skewness", desc_ja: "スペクトルの歪度。高低周波数の偏り", desc_en: "Asymmetry of spectrum around centroid", range: "-∞ - +∞" },
  perceptualSpread: { name: "Perceptual Spread", osc: "/music/perceptualSpread", desc_ja: "知覚的なスペクトルの広がり", desc_en: "Perceptual spread of the spectrum", range: "0 - 1" },
  perceptualSharpness: { name: "Perceptual Sharpness", osc: "/music/perceptualSharpness", desc_ja: "知覚的な鋭さ（高周波成分の強さ）", desc_en: "Perceived sharpness (high frequency content)", range: "0+" },
  energy: { name: "Energy", osc: "/music/energy", desc_ja: "信号の総エネルギー", desc_en: "Total energy of the signal", range: "0+" },
  mfcc: { name: "MFCC (13 coefficients)", osc: "/music/mfcc/0-12", desc_ja: "メル周波数ケプストラム係数。音色の特徴量。機械学習や音色比較に使用", desc_en: "Mel-frequency cepstral coefficients. Represents timbral texture. Used in ML and timbre comparison", range: "-∞ - +∞" },
  chroma: { name: "Chroma (12 pitch classes)", osc: "/music/chroma/0-11", desc_ja: "12音階ごとのエネルギー分布（C, C#, D, ...B）。和音やキー検出に使用", desc_en: "Energy distribution across 12 pitch classes (C, C#, D, ...B). Used for chord/key detection", range: "0 - 1" },
};

const ALL_FEATURE_KEYS = ["pitch", "note", "rms", "centroid", ...MEYDA_SCALAR_FEATURES, "mfcc", "chroma"];

// Normalize a value to 0-1 range for display bars
// Ranges are based on typical Meyda output for 44.1kHz, FFT 4096
function normalizeValue(key: string, value: number): number {
  switch (key) {
    case "rms": return Math.min(1, value / 0.5);
    case "spectralFlatness": return Math.min(1, value);
    case "perceptualSpread": return Math.min(1, value);
    case "centroid": return Math.min(1, value / 8000);
    case "spectralRolloff": return Math.min(1, value / 15000);
    case "loudness": return Math.min(1, value / 100);
    case "zcr": return Math.min(1, value / 500);
    case "spectralSpread": return Math.min(1, value / 8000);
    case "energy": return Math.min(1, value / 0.5);
    case "perceptualSharpness": return Math.min(1, value / 10);
    case "spectralKurtosis": return Math.min(1, Math.abs(value) / 100);
    case "spectralSkewness": return Math.min(1, Math.abs(value) / 50);
    default: return Math.min(1, Math.abs(value) / 50);
  }
}

// Normalize chroma: relative to max in frame so bars show relative differences
function normalizeChroma(chroma: number[]): number[] {
  const max = Math.max(...chroma, 1e-10);
  return chroma.map((v) => v / max);
}

// Normalize MFCC: first coefficient is much larger, normalize each independently
function normalizeMfcc(mfcc: number[]): number[] {
  return mfcc.map((v, i) => {
    // Coefficient 0 is energy-like (range ~-50 to 50), others are smaller (~-20 to 20)
    const range = i === 0 ? 100 : 40;
    return Math.min(1, Math.max(0, (v + range / 2) / range));
  });
}

function getBarColor(key: string): string {
  if (key.startsWith("spectral") || key === "centroid") return "bg-purple-500";
  if (key.startsWith("perceptual")) return "bg-cyan-500";
  if (key === "rms" || key === "loudness" || key === "energy") return "bg-green-500";
  if (key === "zcr") return "bg-yellow-500";
  return "bg-blue-500";
}

export default function MusicInfoTab({
  info,
  enabledFeatures,
  onToggleFeature,
  timeDomainData,
  frequencyData,
}: Props) {
  const [showRef, setShowRef] = useState(false);

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
      {/* Header with reference button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Music Features</span>
        <button
          onClick={() => setShowRef(true)}
          className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors"
        >
          Feature Reference
        </button>
      </div>

      {/* Big pitch display */}
      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <input
            type="checkbox"
            checked={enabledFeatures.has("pitch") && enabledFeatures.has("note")}
            onChange={() => { onToggleFeature("pitch"); onToggleFeature("note"); }}
            className="accent-blue-500"
          />
          <span className="text-xs text-gray-500">Pitch</span>
        </div>
        <div className="text-3xl font-bold text-blue-400 font-mono">
          {info.noteName}
        </div>
        <div className="text-sm text-gray-500 font-mono">
          {info.pitch > 0 ? `${info.pitch.toFixed(1)} Hz` : "—"}
        </div>
      </div>

      {/* Feature checkboxes (compact toggle list) */}
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">OSC Features (check to enable + display)</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {["rms", "centroid", ...MEYDA_SCALAR_FEATURES, "mfcc", "chroma"].map((key) => (
            <label key={key} className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={enabledFeatures.has(key)}
                onChange={() => onToggleFeature(key)}
                className="accent-blue-500"
              />
              {FEATURE_REFERENCE[key]?.name || key}
            </label>
          ))}
        </div>
      </div>

      {/* Active scalar features - only render checked ones */}
      {(["rms", "centroid", ...MEYDA_SCALAR_FEATURES] as string[])
        .filter((key) => enabledFeatures.has(key))
        .map((key) => (
          <FeatureRow
            key={key}
            featureKey={key}
            label={FEATURE_REFERENCE[key]?.name || key}
            value={info[key as keyof MusicInfo] as number}
            format={key === "centroid" || key === "spectralRolloff" ? (v: number) => `${v.toFixed(0)} Hz` : (v: number) => v.toFixed(3)}
            enabled={true}
            onToggle={onToggleFeature}
            hideCheckbox
          />
        ))
      }

      {/* MFCC - only render when checked */}
      {enabledFeatures.has("mfcc") && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <span className="text-xs text-gray-400">MFCC (13 coefficients)</span>
          <div className="flex items-end gap-1 mt-2" style={{ height: "96px" }}>
            {normalizeMfcc(info.mfcc).map((normalized, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full">
                <div className="w-full bg-gray-700 rounded-sm relative flex-1">
                  <div
                    className="absolute bottom-0 w-full bg-orange-500 rounded-sm transition-all duration-75"
                    style={{ height: `${normalized * 100}%` }}
                  />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">{i}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chroma - only render when checked */}
      {enabledFeatures.has("chroma") && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <span className="text-xs text-gray-400">Chroma (12 pitch classes)</span>
          <div className="flex items-end gap-1 mt-2" style={{ height: "96px" }}>
            {normalizeChroma(info.chroma).map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full">
                <div className="w-full bg-gray-700 rounded-sm relative flex-1">
                  <div
                    className="absolute bottom-0 w-full bg-teal-500 rounded-sm transition-all duration-75"
                    style={{ height: `${v * 100}%` }}
                  />
                </div>
                <span className="text-[8px] text-gray-600 mt-0.5">{CHROMA_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waveform */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Waveform</label>
        <WaveformDisplay data={timeDomainData} height={60} color="#34d399" />
      </div>

      {/* Spectrum */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Spectrum</label>
        <SpectrumDisplay data={frequencyData} height={80} />
      </div>

      {/* Reference Modal */}
      {showRef && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowRef(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200">Feature Reference</h2>
              <button onClick={() => setShowRef(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 pr-2">Feature</th>
                  <th className="text-left py-2 pr-2">OSC Address</th>
                  <th className="text-left py-2 pr-2">Range</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURE_KEYS.map((key) => {
                  const ref = FEATURE_REFERENCE[key];
                  if (!ref) return null;
                  return (
                    <tr key={key} className="border-b border-gray-700/50">
                      <td className="py-2 pr-2 text-gray-300 font-medium">{ref.name}</td>
                      <td className="py-2 pr-2 text-green-400 font-mono">{ref.osc}</td>
                      <td className="py-2 pr-2 text-gray-500">{ref.range}</td>
                      <td className="py-2 text-gray-400">{ref.desc_ja}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual feature row with bar and value (no checkbox — managed in toggle list)
function FeatureRow({
  featureKey,
  label,
  value,
  format,
  enabled,
  onToggle,
  hideCheckbox,
}: {
  featureKey: string;
  label: string;
  value: number;
  format: (v: number) => string;
  enabled: boolean;
  onToggle: (key: string) => void;
  hideCheckbox?: boolean;
}) {
  const barWidth = normalizeValue(featureKey, value);
  const color = getBarColor(featureKey);

  return (
    <div className="flex items-center gap-2 h-6">
      {!hideCheckbox && (
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => onToggle(featureKey)}
          className="accent-blue-500 shrink-0"
        />
      )}
      <span className="text-xs text-gray-400 w-36 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-75`}
          style={{ width: `${barWidth * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-mono w-20 text-right shrink-0">
        {format(value)}
      </span>
    </div>
  );
}
