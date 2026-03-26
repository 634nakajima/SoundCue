interface OscMessage {
  address: string;
  value: string;
  timestamp: number;
}

const TAB_PREFIXES: Record<string, string[]> = {
  yamnet: ["/yamnet/"],
  tm: ["/tm/"],
  music: ["/music/"],
  speech: ["/speech/"],
};

interface Props {
  messages: OscMessage[];
  activeTab?: string;
}

export default function OscMonitor({ messages, activeTab }: Props) {
  // Deduplicate by address (show latest value per address), sorted
  const latestByAddress = new Map<string, string>();
  const prefixes = activeTab ? TAB_PREFIXES[activeTab] : undefined;
  for (const msg of messages) {
    if (prefixes && !prefixes.some((p) => msg.address.startsWith(p))) continue;
    latestByAddress.set(msg.address, msg.value);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <label className="text-xs text-gray-400 mb-1">OSC Monitor</label>
      <div className="flex-1 bg-gray-900 rounded border border-gray-700 overflow-y-auto text-xs font-mono p-1.5 min-h-[100px]">
        {Array.from(latestByAddress.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([address, value]) => (
          <div
            key={address}
            className="flex justify-between py-0.5 border-b border-gray-800 last:border-0"
          >
            <span className="text-green-400 truncate mr-2">{address}</span>
            <span className="text-gray-300 shrink-0">{value}</span>
          </div>
        ))}
        {latestByAddress.size === 0 && (
          <div className="text-gray-600 text-center py-4">No messages yet</div>
        )}
      </div>
    </div>
  );
}
