import { ArrowLeft } from 'lucide-react';
import { WavePhase, RepWave } from '../../../lib/calculations';
import { WAVE_LABELS, PHASE_LABELS, PHASE_DESCRIPTIONS } from '../../../lib/constants';
import IconButton from '../../../components/ui/IconButton';

interface WorkoutHeaderProps {
  liftName: string;
  wave?: RepWave;
  phase?: WavePhase;
  peakWeek?: number;
  totalPeakWeeks?: number;
  peakingNote?: string;
  // Legacy fallback
  week?: number;
  cycle?: number;
  onBack: () => void;
}

export default function WorkoutHeader({ liftName, wave, phase, peakWeek, totalPeakWeeks, peakingNote, week, cycle, onBack }: WorkoutHeaderProps) {
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
      <IconButton label="Go back" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-6 h-6" aria-hidden="true" />
      </IconButton>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1 animate-slide-in-left">{liftName} Day</h1>
      {subtitle && <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>}
      {peakingNote ? (
        <p className="text-sm text-gray-400 dark:text-gray-400 mt-1">{peakingNote}</p>
      ) : (
        phase && PHASE_DESCRIPTIONS[phase] && (
          <p className="text-sm text-gray-400 dark:text-gray-400 mt-1">{PHASE_DESCRIPTIONS[phase]}</p>
        )
      )}
    </div>
  );
}
