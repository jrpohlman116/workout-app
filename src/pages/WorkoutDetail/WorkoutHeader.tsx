import { ArrowLeft } from 'lucide-react';
import { WavePhase, RepWave } from '../../lib/calculations';

const WAVE_LABELS: Record<number, string> = { 10: '10-Rep Wave', 8: '8-Rep Wave', 5: '5-Rep Wave', 3: '3-Rep Wave' };
const PHASE_LABELS: Record<string, string> = {
  accumulation: 'Accumulation',
  intensification: 'Intensification',
  realization: 'Realization',
  deload: 'Deload',
};

interface WorkoutHeaderProps {
  liftName: string;
  wave?: RepWave;
  phase?: WavePhase;
  // Legacy fallback
  week?: number;
  cycle?: number;
  onBack: () => void;
}

export default function WorkoutHeader({ liftName, wave, phase, week, cycle, onBack }: WorkoutHeaderProps) {
  const subtitle = wave && phase
    ? `${WAVE_LABELS[wave]} — ${PHASE_LABELS[phase]}`
    : week !== undefined && cycle !== undefined
      ? `Week ${week} — Cycle ${cycle}`
      : '';

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-6">
      <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{liftName} Day</h1>
      {subtitle && <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>}
    </div>
  );
}
