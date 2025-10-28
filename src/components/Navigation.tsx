import { Home, Calculator, TrendingUp, User } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, description: 'View your workouts and progress overview' },
    { id: 'calculator', label: 'Calculator', icon: Calculator, description: 'Calculate your one rep max and Wilks score' },
    { id: 'progress', label: 'Progress', icon: TrendingUp, description: 'Track your strength gains over time' },
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your account and training settings' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={`${item.label} - ${item.description}`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : ''}`}>
                <Icon className="w-6 h-6" aria-hidden="true" />
                {isActive && (
                  <span className="sr-only">(current page)</span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium" aria-hidden="true">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
