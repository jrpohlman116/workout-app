interface Tab<T extends string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  onRipple?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function TabBar<T extends string>({ tabs, activeTab, onChange, onRipple }: TabBarProps<T>) {
  return (
    <div className="max-w-md mx-auto px-4">
      <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-white/20">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={(e) => {
              onRipple?.(e);
              onChange(tab.id);
            }}
            className={`pt-3 pb-3 font-semibold whitespace-nowrap transition-colors relative overflow-hidden ${
              activeTab === tab.id
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
