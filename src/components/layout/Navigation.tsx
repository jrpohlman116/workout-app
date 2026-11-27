import { Home, CalendarCheck, TrendingUp, LayoutGrid } from 'lucide-react';
import type { Tab } from '../../lib/routes';

interface NavigationProps {
  currentTab: Tab;
  onNavigate: (tab: Tab) => void;
}

// Four tabs (proposal #12): Home, Today, Progress, More. Calculator and
// Profile live inside More.
const NAV_ITEMS: { id: Tab; label: string; icon: typeof Home; description: string }[] = [
  { id: 'home', label: 'Home', icon: Home, description: 'Readiness and this week' },
  { id: 'today', label: 'Today', icon: CalendarCheck, description: "Today's session" },
  { id: 'progress', label: 'Progress', icon: TrendingUp, description: 'Your program and strength over time' },
  { id: 'more', label: 'More', icon: LayoutGrid, description: 'Tools and settings' },
];

export default function Navigation({ currentTab, onNavigate }: NavigationProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-blue-700 dark:bg-blue-900 border-t border-blue-600/50 dark:border-blue-800 safe-bottom transition-colors"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-16 max-w-md mx-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-label={`${item.label} - ${item.description}`}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 ${
                isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[50px] h-0.5 bg-white rounded-full" aria-hidden="true" />
              )}
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] leading-[13px] font-semibold" aria-hidden="true">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
