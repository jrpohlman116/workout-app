import { useState } from 'react';
import AccessibleFormGroup from '../../../components/accessible/AccessibleFormGroup';
import { WavePhase, WarmupFeel, calculateBackoffSets, calculateWarmupSets } from '../../../lib/calculations';
import { SetInput } from '../../../lib/types';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import SetCheck from '../../../components/ui/SetCheck';

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
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
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
  onUpdateSet,
  onRpeChange,
  onWorkingWeightAdjust,
  onNext,
  nextExerciseName,
}: MainLiftViewProps) {
  const [selectedRpe, setSelectedRpe] = useState<RpeValue | null>(null);
  const [set4Feel, setSet4Feel] = useState<WarmupFeel | null>(null);
  const [set5Feel, setSet5Feel] = useState<WarmupFeel | null>(null);

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

  const description = isRealization
    ? 'After warm-ups, push for max reps on your top set.'
    : isDeload
      ? 'Complete all sets at reduced effort. No grinding.'
      : isPeaking
        ? (mainSets.length > 1
            ? 'Work up to your single, then complete the down sets.'
            : 'One heavy single after warm-ups. Crisp and fast — nothing else today.')
        : `Complete all ${mainSets.length} sets at the prescribed weight.`;

  const warmupBase = baseWeight ?? topSetWeight;
  const warmup = warmupBase > 0 ? calculateWarmupSets(warmupBase, unitPreference) : null;
  const approachWeight = set4Feel && warmup ? warmup.getApproachWeight(set4Feel) : null;
  const adjustedWeight = set4Feel && set5Feel && warmup ? warmup.getAdjustedWorkingWeight(set4Feel, set5Feel) : null;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {warmup && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Warm-up Progression</h3>
          <div className="space-y-3">
            {warmup.fixedSets.map((set, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {onToggleWarmupCheck && (
                  <SetCheck
                    checked={!!warmupChecks?.[idx]}
                    label={warmupChecks?.[idx]
                      ? `Warm-up set ${idx + 1} done — tap to undo`
                      : `Mark warm-up set ${idx + 1} done`}
                    onToggle={() => onToggleWarmupCheck(idx)}
                  />
                )}
                <div className="flex-1 flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {set.percentage === 0 ? 'Bar' : `${set.percentage}%`}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    {set.weight} {unitPreference} × {set.reps}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Stage 1: how did 82% feel? */}
          {!set4Feel && topSetWeight > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">How did the 82% set feel?</p>
              <div className="flex gap-2">
                {(['easy', 'good', 'bad'] as WarmupFeel[]).map(feel => (
                  <Button
                    key={feel}
                    variant="tertiary"
                    size="sm"
                    onClick={() => setSet4Feel(feel)}
                    className="flex-1 py-2.5 capitalize"
                  >
                    {feel.charAt(0).toUpperCase() + feel.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Stage 2: approach single + how did it feel? */}
          {set4Feel && approachWeight && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Approach Single</p>
                <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                  {approachWeight} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unitPreference} × 1</span>
                </p>
              </div>

              {!set5Feel && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">How did the approach feel?</p>
                  <div className="flex gap-2">
                    {(['easy', 'good', 'bad'] as WarmupFeel[]).map(feel => (
                      <Button
                        key={feel}
                        variant="tertiary"
                        size="sm"
                        onClick={() => {
                          setSet5Feel(feel);
                          if (warmup) {
                            onWorkingWeightAdjust?.(warmup.getAdjustedWorkingWeight(set4Feel, feel));
                          }
                        }}
                        className="flex-1 py-2.5 capitalize"
                      >
                        {feel.charAt(0).toUpperCase() + feel.slice(1)}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {/* Stage 3: adjusted working weight */}
              {set5Feel && adjustedWeight !== null && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Your Working Weight</p>
                  <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                    {adjustedWeight} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span>
                  </p>
                  {adjustedWeight !== warmupBase && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      {adjustedWeight > warmupBase ? '+' : ''}{adjustedWeight - warmupBase} {unitPreference} from planned — adjusted for today.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {isRealization && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">AMAP — As Many As Possible</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Stop 1 rep before failure. Rest, then note your reps.</p>
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
        repsPlaceholder={isRealization
          ? `${typeof mainReps === 'number' ? mainReps : 1}+`
          : mainReps === '5-3-1' ? '5' : String(mainReps)}
        weightPlaceholder="0"
        minSets={mainSets.length}
        maxSets={mainSets.length}
        lastSetData={lastSetData}
        setChecks={setChecks}
        onToggleSetCheck={onToggleSetCheck}
      />

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
    </div>
  );
}
