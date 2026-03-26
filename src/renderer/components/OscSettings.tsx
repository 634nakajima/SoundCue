import { useState, useEffect } from "react";

interface Props {
  sendHost: string;
  sendPort: number;
  receivePort: number;
  onApply: (host: string, sendPort: number, receivePort: number) => void;
}

export default function OscSettings({ sendHost, sendPort, receivePort, onApply }: Props) {
  const [host, setHost] = useState(sendHost);
  const [sp, setSp] = useState(sendPort);
  const [rp, setRp] = useState(receivePort);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHost(sendHost);
    setSp(sendPort);
    setRp(receivePort);
  }, [sendHost, sendPort, receivePort]);

  const handleApply = () => {
    onApply(host, sp, rp);
    setOpen(false);
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-400">OSC</label>
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-400 hover:text-gray-200 transition-colors"
          title="OSC Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <div className="text-xs text-gray-500 font-mono">
        {sendHost}:{sendPort} → :{receivePort}
      </div>

      {open && (
        <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700 space-y-2">
          <div>
            <label className="text-xs text-gray-400">Send Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full bg-gray-900 text-gray-200 text-sm rounded px-2 py-1 border border-gray-700 mt-0.5"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Send Port</label>
              <input
                type="number"
                value={sp}
                onChange={(e) => setSp(Number(e.target.value))}
                className="w-full bg-gray-900 text-gray-200 text-sm rounded px-2 py-1 border border-gray-700 mt-0.5"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">Receive Port</label>
              <input
                type="number"
                value={rp}
                onChange={(e) => setRp(Number(e.target.value))}
                className="w-full bg-gray-900 text-gray-200 text-sm rounded px-2 py-1 border border-gray-700 mt-0.5"
              />
            </div>
          </div>
          <button
            onClick={handleApply}
            className="w-full text-sm bg-blue-600 hover:bg-blue-500 text-white rounded py-1"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
