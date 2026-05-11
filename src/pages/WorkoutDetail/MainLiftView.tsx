import { useState } from 'react';
import AccessibleFormGroup from '../../components/accessible/AccessibleFormGroup';
import { WavePhase, calculateBackoffSets, calculateWarmupSets } from '../../lib/calculations';
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
  const [warmupFeel, setWarmupFeel] = useState<'smooth' | 'tough' | null>(null);

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

  const warmup = topSetWeight > 0 ? calculateWarmupSets(topSetWeight, unitPreference) : null;
  const approachWeight = warmupFeel === 'smooth' ? warmup?.approachWeights.smooth : warmupFeel === 'tough' ? warmup?.approachWeights.tough : null;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {warmup && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Warm-up Progression</h3>
          <div className="space-y-3">
            {warmup.fixedSets.map((set, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {set.percentage === 0 ? 'Bar' : `${set.percentage}%`}
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">
                  {set.weight} {unitPreference} × {set.reps}
                </span>
              </div>
            ))}
          </div>
          {!warmupFeel && topSetWeight > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">How did the 82% set feel?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setWarmupFeel('smooth')}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active-press"
                >
                  Smooth
                </button>
                <button
                  onClick={() => setWarmupFeel('tough')}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active-press"
                >
                  Tough
                </button>
              </div>
            </div>
          )}
          {approachWeight && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Approach Single</p>
              <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                {approachWeight} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{unitPreference}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {warmupFeel === 'smooth'
                  ? 'You felt strong. Approach at 95%, then go for your planned top set if smooth.'
                  : 'That was tough. Approach at 93%, then reassess before going heavier.'}
              </p>
            </div>
          )}
        </div>
      )}

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
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Back-off Sets</p>
              <p className="text-xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                {backoff.sets} × {backoff.reps} @ {backoff.weight} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{unitPreference}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                RPE {selectedRpe} · {Math.round((1 - backoff.weight / topSetWeight) * 100)}% drop from top set
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
