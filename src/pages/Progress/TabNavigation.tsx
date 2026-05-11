type Tab = 'overview' | 'weight' | 'volume' | 'log';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onRipple: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function TabNavigation({ activeTab, onTabChange, onRipple }: TabNavigationProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'weight', label: 'Best Weight' },
    { id: 'volume', label: 'Best Volume' },
    { id: 'log', label: 'Workout Log' },
  ];

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={(e) => {
              onRipple(e);
              onTabChange(tab.id);
            }}
            className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${activeTab === tab.id
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-gray-100" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
