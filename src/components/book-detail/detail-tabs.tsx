"use client";

interface DetailTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = ["About", "Insights", "Notes"] as const;

export function DetailTabs({ activeTab, onTabChange }: DetailTabsProps) {
  return (
    <div className="flex border-b border-warm-border mb-6">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 font-sans text-sm font-medium cursor-pointer transition-colors ${
            activeTab === tab
              ? "text-foreground border-b-2 border-amber"
              : "text-warm-gray hover:text-foreground"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
