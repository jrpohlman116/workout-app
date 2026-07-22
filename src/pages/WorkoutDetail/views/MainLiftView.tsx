import { useState } from 'react';
import { Check, Play } from 'lucide-react';
import { WavePhase, WarmupFeel, calculateBackoffSets, calculateWarmupSets, calculatePlateBreakdown, formatPlateBreakdown, getRoundingIncrement, BAR_WEIGHTS } from '../../../lib/calculations';
import { WEIGHT_DISPLAY_RANGE_LOW, WEIGHT_DISPLAY_RANGE_HIGH } from '../../../lib/constants';
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
  /** Atomic reps+weight commit from the focused set-logging modal — two
      sequential onUpdateSet calls would clobber each other in one batch. */
  onUpdateSetValues?: (index: number, reps: string, weight: string) => void;
  onRpeChange?: (rpe: number | null) => void;
  onWorkingWeightAdjust?: (weight: number) => void;
  onNext: () => void;
  nextExerciseName: string | null;
}

const RPE_OPTIONS = [6, 7, 8, 9, 10] as const;
type RpeValue = typeof RPE_OPTIONS[number];

const RPE_DESCRIPTIONS: Record<RpeValue, string> = {
  6: '4+ reps left',
  7: '3 reps left',
  8: '2 reps left',
  9: '1 rep left',
  10: 'Max effort',
};

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
  onRpeChange,
  onWorkingWeightAdjust,
  onNext,
  nextExerciseName,
}: MainLiftViewProps) {
  const [selectedRpe, setSelectedRpe] = useState<RpeValue | null>(null);
  const [set4Feel, setSet4Feel] = useState<WarmupFeel | null>(null);
  const [set5Feel, setSet5Feel] = useState<WarmupFeel | null>(null);
  const [showWarmupFlow, setShowWarmupFlow] = useState(false);
  const [warmupComplete, setWarmupComplete] = useState(false);
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

  const barWeight = BAR_WEIGHTS[unitPreference] ?? BAR_WEIGHTS.lb;
  const plateHint = (weight: number): string | null => {
    if (!availablePlates || availablePlates.length === 0 || !weight) return null;
    const breakdown = calculatePlateBreakdown(weight, barWeight, availablePlates);
    if (!breakdown) return null;
    return breakdown.exact
      ? formatPlateBreakdown(breakdown)
      : `≈${breakdown.loadedWeight}: ${formatPlateBreakdown(breakdown)}`;
  };

  // One bar-loading row per distinct working weight (peaking weeks have two:
  // the single and its down sets), in set order.
  const workingWeights = [...new Set(
    mainSets.map(s => parseFloat(s.weight)).filter(w => w > 0)
  )];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {warmup && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Warm-up Progression</h3>
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
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">AMAP — As Many As Possible</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Stop 1 rep before failure. Rest, then note your reps.</p>
        </div>
      )}

      {availablePlates && availablePlates.length > 0 && workingWeights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-6 py-4">
          <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Bar Loading — per side
          </p>
          <div className="space-y-1.5">
            {workingWeights.map(weight => (
              <div key={weight} className="flex justify-between items-baseline text-sm">
                <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {weight} {unitPreference}
                </span>
                <span className="text-gray-600 dark:text-gray-300 tabular-nums">
                  {plateHint(weight) ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Barbell {liftName}</h3>
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
                <p className="flex-1 font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {set.weight || '—'} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span> × {repsLabel}
                </p>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="py-2.5"
                  onClick={() => setLogSetIndex(index)}
                  aria-label={`Log set ${setNumber}`}
                >
                  Log
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {isRealization && (
        <Card className="p-6 space-y-4">
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

          <div className="text-xs text-gray-400 dark:text-gray-400 flex justify-between px-1">
            {selectedRpe !== null ? (
              <span className="tabular-nums">RPE {selectedRpe} — {RPE_DESCRIPTIONS[selectedRpe]}</span>
            ) : (
              <>
                <span>6 — 4+ reps left</span>
                <span>10 — max effort</span>
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
          initialReps={mainSets[logSetIndex].reps || (typeof mainReps === 'number' ? String(mainReps) : '')}
          initialWeight={mainSets[logSetIndex].weight}
          repsTarget={mainSets[logSetIndex].reps || (isRealization
            ? `${typeof mainReps === 'number' ? mainReps : 1}+`
            : String(mainReps))}
          isAmap={isRealization}
          unit={unitPreference}
          availablePlates={availablePlates ?? []}
          onSave={(reps, weight) => {
            if (onUpdateSetValues) {
              onUpdateSetValues(logSetIndex, reps, weight);
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
          onSet4Feel={setSet4Feel}
          onSet5Feel={(feel) => {
            setSet5Feel(feel);
            if (set4Feel) {
              onWorkingWeightAdjust?.(warmup.getAdjustedWorkingWeight(set4Feel, feel));
            }
          }}
          onComplete={() => {
            setWarmupComplete(true);
            setShowWarmupFlow(false);
          }}
          onClose={() => setShowWarmupFlow(false)}
        />
      )}
    </div>
  );
}
