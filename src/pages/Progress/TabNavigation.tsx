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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-1 flex gap-1 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={(e) => {
            onRipple(e);
            onTabChange(tab.id);
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors relative overflow-hidden ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
