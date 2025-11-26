import { ArrowLeft } from 'lucide-react';

interface WorkoutHeaderProps {
  liftName: string;
  week: number;
  cycle: number;
  onBack: () => void;
}

export default function WorkoutHeader({ liftName, week, cycle, onBack }: WorkoutHeaderProps) {
  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-6">
      <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{liftName} Day</h1>
      <p className="text-gray-600 dark:text-gray-300">Week {week} - Cycle {cycle}</p>
    </div>
  );
}
