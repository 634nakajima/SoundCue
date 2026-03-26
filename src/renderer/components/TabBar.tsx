export type TabId = "yamnet" | "tm" | "music" | "speech";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "yamnet", label: "YAMNet" },
  { id: "tm", label: "Teachable Machine" },
  { id: "music", label: "Music Info" },
  { id: "speech", label: "Speech" },
];

interface Props {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

export default function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex border-b border-gray-700 bg-gray-900/50">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800/50"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
