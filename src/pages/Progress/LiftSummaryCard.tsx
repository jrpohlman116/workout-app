import { TrendingUp, TrendingDown } from 'lucide-react';

interface LiftSummaryCardProps {
  name: string;
  displayName: string;
  current: number;
  initial: number;
  changePercent: string;
  isVisible: boolean;
}

export default function LiftSummaryCard({ name, displayName, current, initial, changePercent, isVisible }: LiftSummaryCardProps) {
  const change = parseFloat(changePercent);
  const isPositive = change >= 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">{displayName}</h3>
        {change !== 0 && (
          <span
            className={`flex items-center text-xs font-semibold ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{current} lb</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">Started: {initial} lb</p>
    </div>
  );
}
