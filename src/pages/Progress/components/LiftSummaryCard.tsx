import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../../../components/ui/Card';

interface LiftSummaryCardProps {
  name: string;
  displayName: string;
  current: number;
  initial: number;
  changePercent: string;
  isVisible: boolean;
  unitPreference?: string;
}

export default function LiftSummaryCard({ name, displayName, current, initial, changePercent, isVisible, unitPreference = 'lb' }: LiftSummaryCardProps) {
  const change = parseFloat(changePercent);
  const isPositive = change >= 0;

  return (
    <Card className={`p-4 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 leading-tight">{displayName}</h3>
        {change !== 0 && (
          <span
            className={`flex items-center text-xs font-semibold flex-shrink-0 ml-1 ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100 mb-0.5 leading-none">{current} <span className="text-xs font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span></p>
      <p className="text-xs text-gray-400 dark:text-gray-400 tabular-nums">from {initial}</p>
    </Card>
  );
}
