import { type AudioDevice } from "../hooks/useAudioInput";

interface Props {
  devices: AudioDevice[];
  activeDeviceId: string;
  onSelect: (deviceId: string) => void;
}

export default function AudioInputSelector({ devices, activeDeviceId, onSelect }: Props) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">Audio Input</label>
      <select
        value={activeDeviceId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-gray-800 text-gray-200 text-sm rounded px-2 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}
