import { useState } from 'react';
import { Check, Play, Plus } from 'lucide-react';
import { WavePhase, WarmupFeel, calculateBackoffSets, calculateWarmupSets, getRoundingIncrement } from '../../../lib/calculations';
import { WEIGHT_DISPLAY_RANGE_LOW, WEIGHT_DISPLAY_RANGE_HIGH, RPE_OPTIONS, RPE_DESCRIPTIONS, RpeValue } from '../../../lib/constants';
import { SetInput } from '../../../lib/types';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import SetCheck from '../../../components/ui/SetCheck';
import WarmupFlow from '../../../components/features/WarmupFlow';
import WorkingSetModal from '../../../components/features/WorkingSetModal';

interface MainLiftViewProps {
  liftName: string;
  mainSets: SetInput[];
  mainReps: string | number;
  unitPreference: string;
  lastSetData: string;
  phase?: WavePhase;
  baseWeight?: number;
  warmupChecks?: boolean[];
  onToggleWarmupCheck?: (index: number) => void;
  setChecks?: boolean[];
  onToggleSetCheck?: (index: number) => void;
  badDayDrop?: number;
  onBadDayDrop?: (dropPct: number) => void;
  /** User's available plates for the current unit — enables per-side
      plate-loading hints on warm-ups and working weights. */
  availablePlates?: number[];
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  /** Atomic reps+weight(+rpe+vbt) commit from the focused set-logging modal —
      sequential onUpdateSet calls would clobber each other in one batch. */
  onUpdateSetValues?: (index: number, reps: string, weight: string, rpe?: string, vbt?: string) => void;
  /** Appends an extra set beyond the prescribed count — going beyond the
      plan is always allowed; removing a prescribed set is not (skip it via
      the check chip instead). Omit to hide the affordance entirely. */
  onAddSet?: () => void;
  onRpeChange?: (rpe: number | null) => void;
  onWorkingWeightAdjust?: (weight: number) => void;
  /** Warm-up feel ratings and completion — lifted to the parent so they
      survive a remount (see WorkoutDetailPage's localStorage draft). */
  set4Feel: WarmupFeel | null;
  set5Feel: WarmupFeel | null;
  onSet4FeelChange: (feel: WarmupFeel | null) => void;
  onSet5FeelChange: (feel: WarmupFeel | null) => void;
  warmupComplete: boolean;
  onWarmupCompleteChange: (complete: boolean) => void;
  onNext: () => void;
  nextExerciseName: string | null;
}

export default function MainLiftView({
  liftName,
  mainSets,
  mainReps,
  unitPreference,
  lastSetData,
  phase,
  baseWeight,
  warmupChecks,
  onToggleWarmupCheck,
  setChecks,
  onToggleSetCheck,
  badDayDrop = 0,
  onBadDayDrop,
  availablePlates,
  onUpdateSet,
  onUpdateSetValues,
  onAddSet,
  onRpeChange,
  onWorkingWeightAdjust,
  set4Feel,
  set5Feel,
  onSet4FeelChange,
  onSet5FeelChange,
  warmupComplete,
  onWarmupCompleteChange,
  onNext,
  nextExerciseName,
}: MainLiftViewProps) {
  const [selectedRpe, setSelectedRpe] = useState<RpeValue | null>(null);
  const [showWarmupFlow, setShowWarmupFlow] = useState(false);
  const [logSetIndex, setLogSetIndex] = useState<number | null>(null);

  const isRealization = phase === 'realization';
  const isDeload = phase === 'deload';
  const isPeaking = phase === 'peaking';

  const topSet = mainSets[mainSets.length - 1];
  const topSetWeight = parseFloat(topSet?.weight || '0');
  const backoff = selectedRpe !== null && topSetWeight > 0
    ? calculateBackoffSets(topSetWeight, selectedRpe, unitPreference)
    : null;

  const handleRpeSelect = (rpe: RpeValue) => {
    const next = selectedRpe === rpe ? null : rpe;
    setSelectedRpe(next);
    onRpeChange?.(next);
  };

  const warmupBase = baseWeight ?? topSetWeight;
  const warmup = warmupBase > 0 ? calculateWarmupSets(warmupBase, unitPreference) : null;
  const adjustedWeight = set4Feel && set5Feel && warmup ? warmup.getAdjustedWorkingWeight(set4Feel, set5Feel) : null;

  // Working weights display as a ±4% range until the warm-up flow locks
  // today's number — warm-ups decide the weight, not the other way around.
  const roundTo = getRoundingIncrement(unitPreference);
  const rangeLow = Math.round(warmupBase * WEIGHT_DISPLAY_RANGE_LOW / roundTo) * roundTo;
  const rangeHigh = Math.round(warmupBase * WEIGHT_DISPLAY_RANGE_HIGH / roundTo) * roundTo;
  const showRange = !!warmup && !warmupComplete && !isDeload;

  const baseDescription = isRealization
    ? 'After warm-ups, push for max reps on your top set.'
    : isDeload
      ? 'Complete all sets at reduced effort. No grinding.'
      : isPeaking
        ? (mainSets.length > 1
            ? 'Work up to your single, then complete the down sets.'
            : 'One heavy single after warm-ups. Crisp and fast — nothing else today.')
        : `Complete all ${mainSets.length} sets at the prescribed weight.`;

  const description = showRange
    ? `${baseDescription} Target ${rangeLow}–${rangeHigh} ${unitPreference} — finish the warm-up to lock today's weight.`
    : baseDescription;

  const checkedWarmups = warmup
    ? warmup.fixedSets.filter((_, idx) => warmupChecks?.[idx]).length
    : 0;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {warmup && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Warm-up Progression</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {warmupComplete
              ? `Done — working weight ${adjustedWeight ?? warmupBase} ${unitPreference}.`
              : checkedWarmups > 0
                ? `${checkedWarmups} of ${warmup.fixedSets.length} sets done — pick up where you left off.`
                : `${warmup.fixedSets.length} sets, one at a time — locks in today's working weight.`}
          </p>
          <Button
            type="button"
            variant={warmupComplete ? 'ghost' : 'primary'}
            size="md"
            fullWidth
            icon={warmupComplete ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            onClick={() => setShowWarmupFlow(true)}
          >
            {warmupComplete ? 'Warm-up done — review' : checkedWarmups > 0 ? 'Continue Warm-up' : 'Start Warm-up'}
          </Button>
          {badDayDrop > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3" role="status">
              Weights reduced {Math.round(badDayDrop * 100)}% for today — smart call.
            </p>
          )}
        </Card>
      )}

      {isRealization && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">AMRAP — As Many As Possible</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Stop 1 rep before failure. Rest, then note your reps.</p>
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-h2 text-gray-900 dark:text-gray-100 mb-1">Barbell {liftName}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{description}</p>

        {lastSetData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Previous Session</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{lastSetData}</p>
          </div>
        )}

        <div className="space-y-3">
          {mainSets.map((set, index) => {
            const setNumber = index + 1;
            const repsLabel = set.reps || (isRealization
              ? `${typeof mainReps === 'number' ? mainReps : 1}+`
              : String(mainReps));

            // Each row ranges off its own prescribed weight — peaking weeks
            // mix a single with lighter down sets, so a shared range would
            // be wrong for one or the other. A logged (checked) set shows
            // its real recorded weight, never a range.
            const rowWeight = parseFloat(set.weight) || 0;
            const showRowRange = showRange && !setChecks?.[index] && rowWeight > 0;
            const rowRangeLow = Math.round(rowWeight * WEIGHT_DISPLAY_RANGE_LOW / roundTo) * roundTo;
            const rowRangeHigh = Math.round(rowWeight * WEIGHT_DISPLAY_RANGE_HIGH / roundTo) * roundTo;
            const weightLabel = showRowRange
              ? `${rowRangeLow}–${rowRangeHigh}`
              : (set.weight || '—');

            return (
              <div key={index} className="flex items-center gap-3" role="group" aria-label={`Set ${setNumber} of ${mainSets.length}`}>
                {onToggleSetCheck ? (
                  <SetCheck
                    checked={!!setChecks?.[index]}
                    label={setChecks?.[index] ? `Set ${setNumber} done — tap to undo` : `Mark set ${setNumber} done`}
                    display={String(setNumber)}
                    onToggle={() => onToggleSetCheck(index)}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-300 flex-shrink-0 tabular-nums select-none"
                  >
                    {setNumber}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                    {weightLabel} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span> × {repsLabel}
                  </p>
                  {(set.rpe || set.vbt) && (
                    <p className="text-xs text-gray-400 dark:text-gray-400 tabular-nums">
                      {set.rpe && `RPE ${set.rpe}`}
                      {set.rpe && set.vbt && ' · '}
                      {set.vbt && `${set.vbt} m/s`}
                    </p>
                  )}
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="py-3"
                  onClick={() => setLogSetIndex(index)}
                  aria-label={`Log set ${setNumber}`}
                >
                  Log
                </Button>
              </div>
            );
          })}
        </div>

        {onAddSet && (
          mainSets.length < 10 ? (
            <Button
              type="button"
              variant="dashed"
              size="md"
              fullWidth
              icon={<Plus className="w-4 h-4" />}
              onClick={onAddSet}
              aria-label={`Add another set (${mainSets.length} of 10 sets used)`}
              className="mt-4"
            >
              Add Set
            </Button>
          ) : (
            <p className="text-xs tracking-wide font-semibold text-gray-400 dark:text-gray-400 text-center mt-4">
              Max 10 sets
            </p>
          )
        )}
      </Card>

      {isRealization && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">How hard was that top set?</h2>
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

          <div className="text-xs text-gray-400 dark:text-gray-400 flex justify-between px-1">
            {selectedRpe !== null ? (
              <span className="tabular-nums">RPE {selectedRpe} — {RPE_DESCRIPTIONS[selectedRpe]}</span>
            ) : (
              <>
                <span>{RPE_OPTIONS[0]} — {RPE_DESCRIPTIONS[RPE_OPTIONS[0]]}</span>
                <span>{RPE_OPTIONS[RPE_OPTIONS.length - 1]} — {RPE_DESCRIPTIONS[RPE_OPTIONS[RPE_OPTIONS.length - 1]].toLowerCase()}</span>
              </>
            )}
          </div>

          {backoff && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Back-off Sets</p>
              <p className="text-xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                {backoff.sets} × {backoff.reps} @ {backoff.weight} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                RPE {selectedRpe} · {Math.round((1 - backoff.weight / topSetWeight) * 100)}% drop from top set
              </p>
            </div>
          )}
        </Card>
      )}

      <Button
        fullWidth
        onClick={onNext}
      >
        Next: {nextExerciseName}
      </Button>

      {logSetIndex !== null && mainSets[logSetIndex] && (
        <WorkingSetModal
          setNumber={logSetIndex + 1}
          totalSets={mainSets.length}
          initialReps={mainSets[logSetIndex].reps || (isRealization || typeof mainReps !== 'number' ? '' : String(mainReps))}
          initialWeight={mainSets[logSetIndex].weight}
          initialRpe={mainSets[logSetIndex].rpe ?? ''}
          initialVbt={mainSets[logSetIndex].vbt ?? ''}
          repsTarget={mainSets[logSetIndex].reps || (isRealization
            ? `${typeof mainReps === 'number' ? mainReps : 1}+`
            : String(mainReps))}
          isAmap={isRealization}
          unit={unitPreference}
          availablePlates={availablePlates ?? []}
          onSave={(reps, weight, rpe, vbt) => {
            if (onUpdateSetValues) {
              onUpdateSetValues(logSetIndex, reps, weight, rpe, vbt);
            } else {
              onUpdateSet(logSetIndex, 'reps', reps);
              onUpdateSet(logSetIndex, 'weight', weight);
            }
            if (onToggleSetCheck && !setChecks?.[logSetIndex]) {
              onToggleSetCheck(logSetIndex);
            }
            setLogSetIndex(null);
          }}
          onClose={() => setLogSetIndex(null)}
        />
      )}

      {showWarmupFlow && warmup && (
        <WarmupFlow
          warmup={warmup}
          plannedWeight={warmupBase}
          adjustedWeight={adjustedWeight}
          currentTopWeight={parseFloat(mainSets[0]?.weight || '0')}
          unit={unitPreference}
          availablePlates={availablePlates ?? []}
          warmupChecks={warmupChecks ?? []}
          set4Feel={set4Feel}
          set5Feel={set5Feel}
          badDayDrop={badDayDrop}
          onBadDayDrop={onBadDayDrop}
          onCheckSet={(index) => {
            if (!warmupChecks?.[index]) onToggleWarmupCheck?.(index);
          }}
          onSet4Feel={onSet4FeelChange}
          onSet5Feel={(feel) => {
            onSet5FeelChange(feel);
            if (set4Feel) {
              onWorkingWeightAdjust?.(warmup.getAdjustedWorkingWeight(set4Feel, feel));
            }
          }}
          onComplete={() => {
            onWarmupCompleteChange(true);
            setShowWarmupFlow(false);
          }}
          onClose={() => setShowWarmupFlow(false)}
        />
      )}
    </div>
  );
}
