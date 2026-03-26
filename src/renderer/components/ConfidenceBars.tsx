interface Item {
  label: string;
  confidence: number;
}

interface Props {
  items: Item[];
  maxItems?: number;
}

export default function ConfidenceBars({ items, maxItems = 10 }: Props) {
  const displayed = items.slice(0, maxItems);

  return (
    <div className="space-y-1.5">
      {displayed.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-300 w-36 truncate" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, item.confidence * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono w-12 text-right">
            {(item.confidence * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      {displayed.length === 0 && (
        <div className="text-sm text-gray-600 text-center py-4">
          Waiting for results...
        </div>
      )}
    </div>
  );
}
