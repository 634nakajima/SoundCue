import WaveformDisplay from "../WaveformDisplay";
import SpectrumDisplay from "../SpectrumDisplay";

interface Props {
  pitch: number;
  noteName: string;
  rms: number;
  centroid: number;
  timeDomainData: Uint8Array | null;
  frequencyData: Uint8Array | null;
}

export default function MusicInfoTab({
  pitch,
  noteName,
  rms,
  centroid,
  timeDomainData,
  frequencyData,
}: Props) {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Big displays */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pitch */}
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Pitch</div>
          <div className="text-3xl font-bold text-blue-400 font-mono">
            {noteName}
          </div>
          <div className="text-sm text-gray-500 font-mono">
            {pitch > 0 ? `${pitch.toFixed(1)} Hz` : "—"}
          </div>
        </div>

        {/* Features */}
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div>
            <div className="text-xs text-gray-500">RMS Level</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, rms * 200)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 font-mono w-12 text-right">
                {rms.toFixed(3)}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Spectral Centroid</div>
            <div className="text-lg font-mono text-purple-400">
              {centroid > 0 ? `${centroid.toFixed(0)} Hz` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Waveform</label>
        <WaveformDisplay data={timeDomainData} height={80} color="#34d399" />
      </div>

      {/* Spectrum */}
      <div className="flex-1">
        <label className="text-xs text-gray-500 mb-1 block">Spectrum</label>
        <SpectrumDisplay data={frequencyData} height={120} />
      </div>
    </div>
  );
}
