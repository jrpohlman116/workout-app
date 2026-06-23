import { ArrowLeft } from 'lucide-react';
import { WavePhase, RepWave } from '../../../lib/calculations';
import { WAVE_LABELS, PHASE_LABELS, PHASE_DESCRIPTIONS } from '../../../lib/constants';

interface WorkoutHeaderProps {
  liftName: string;
  wave?: RepWave;
  phase?: WavePhase;
  peakWeek?: number;
  totalPeakWeeks?: number;
  // Legacy fallback
  week?: number;
  cycle?: number;
  onBack: () => void;
}

export default function WorkoutHeader({ liftName, wave, phase, peakWeek, totalPeakWeeks, week, cycle, onBack }: WorkoutHeaderProps) {
  const subtitle = phase === 'peaking'
    ? `Peaking Block — Week ${peakWeek ?? 1} of ${totalPeakWeeks ?? 3}`
    : phase === 'meet_week'
      ? 'Meet Week'
      : wave && phase
        ? `${WAVE_LABELS[wave]} — ${PHASE_LABELS[phase]}`
        : week !== undefined && cycle !== undefined
          ? `Week ${week} — Cycle ${cycle}`
          : '';

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-6">
      <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1 animate-slide-in-left">{liftName} Day</h1>
      {subtitle && <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>}
      {phase && PHASE_DESCRIPTIONS[phase] && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{PHASE_DESCRIPTIONS[phase]}</p>
      )}
    </div>
  );
}
