import { useState } from 'react';
import AccessibleFormGroup from '../../components/accessible/AccessibleFormGroup';
import { WavePhase, calculateBackoffSets } from '../../lib/calculations';
import { SetInput } from './types';

interface MainLiftViewProps {
  liftName: string;
  mainSets: SetInput[];
  mainReps: string | number;
  unitPreference: string;
  lastSetData: string;
  phase?: WavePhase;
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  onRpeChange?: (rpe: number | null) => void;
  onNext: () => void;
  nextExerciseName: string | null;
}

const RPE_OPTIONS = [6, 7, 8, 9, 10] as const;

export default function MainLiftView({
  liftName,
  mainSets,
  mainReps,
  unitPreference,
  lastSetData,
  phase,
  onUpdateSet,
  onRpeChange,
  onNext,
  nextExerciseName,
}: MainLiftViewProps) {
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);

  const isRealization = phase === 'realization';
  const isDeload = phase === 'deload';

  const topSet = mainSets[mainSets.length - 1];
  const topSetWeight = parseFloat(topSet?.weight || '0');
  const backoff = selectedRpe !== null && topSetWeight > 0
    ? calculateBackoffSets(topSetWeight, selectedRpe, unitPreference)
    : null;

  const handleRpeSelect = (rpe: number) => {
    const next = selectedRpe === rpe ? null : rpe;
    setSelectedRpe(next);
    onRpeChange?.(next);
  };

  const description = isRealization
    ? 'Complete all sets. The final set is AMAP — push for max reps.'
    : isDeload
      ? 'Deload week. Complete all reps at reduced effort, no grinding.'
      : 'Complete all prescribed reps with good technique.';

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <AccessibleFormGroup
        legend={`Barbell ${liftName}`}
        description={description}
        sets={mainSets}
        onUpdateSet={onUpdateSet}
        onAddSet={() => {}}
        onRemoveSet={() => {}}
        weightUnit={unitPreference}
        repsPlaceholder={mainReps === '5-3-1' ? '5' : String(mainReps)}
        weightPlaceholder="0"
        minSets={3}
        maxSets={3}
        lastSetData={lastSetData}
      />

      {isRealization && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">How hard was that top set?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rate of Perceived Exertion — used to calculate your back-off sets</p>
          </div>

          <div className="flex gap-2">
            {RPE_OPTIONS.map((rpe) => (
              <button
                key={rpe}
                onClick={() => handleRpeSelect(rpe)}
                className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-colors ${
                  selectedRpe === rpe
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {rpe}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500 flex justify-between px-1">
            <span>Moderate</span>
            <span>All-out</span>
          </div>

          {backoff && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Back-off Sets</p>
              <p className="text-blue-800 dark:text-blue-200 font-bold">
                {backoff.sets} × {backoff.reps} @ {backoff.weight} {unitPreference}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                RPE {selectedRpe} → {Math.round((1 - backoff.weight / topSetWeight) * 100)}% drop from top set
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 py-4 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
      >
        Next: {nextExerciseName}
      </button>
    </div>
  );
}
