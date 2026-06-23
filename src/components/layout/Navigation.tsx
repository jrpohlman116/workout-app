import { Home, Calculator, TrendingUp, User } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, description: 'View your workouts and progress overview' },
    { id: 'progress', label: 'Progress', icon: TrendingUp, description: 'Track your strength gains over time' },
    { id: 'calculator', label: 'Calculator', icon: Calculator, description: 'Calculate your one rep max and Wilks score' },
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your account and training settings' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-blue-700 dark:bg-blue-900 border-t border-blue-600/50 dark:border-blue-800 safe-bottom transition-colors"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex items-stretch h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={`${item.label} - ${item.description}`}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/50 ${
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-6 right-6 h-0.5 bg-white rounded-full" aria-hidden="true" />
              )}
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-widest font-semibold" aria-hidden="true">
                {item.label}
              </span>
              {isActive && <span className="sr-only">(current page)</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
