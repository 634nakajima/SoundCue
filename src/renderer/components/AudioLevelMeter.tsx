interface Props {
  level: number; // 0-1
}

export default function AudioLevelMeter({ level }: Props) {
  const clampedLevel = Math.min(1, Math.max(0, level));
  const pct = clampedLevel * 100;
  const db = clampedLevel > 0 ? Math.round(20 * Math.log10(clampedLevel)) : -Infinity;

  let color = "bg-green-500";
  if (pct > 80) color = "bg-red-500";
  else if (pct > 50) color = "bg-yellow-500";

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-400">Level</label>
        <span className="text-xs text-gray-500 font-mono">
          {db > -100 ? `${db} dB` : "-∞ dB"}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-75 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
