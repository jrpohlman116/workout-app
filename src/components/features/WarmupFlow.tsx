import { useState } from 'react';
import { WarmupProgression, WarmupFeel, BAR_WEIGHTS } from '../../lib/calculations';
import AccessibleModal from '../accessible/AccessibleModal';
import PlateVisual from './PlateVisual';
import Button from '../ui/Button';

interface WarmupFlowProps {
  warmup: WarmupProgression;
  plannedWeight: number;
  adjustedWeight: number | null;
  unit: string;
  availablePlates: number[];
  warmupChecks: boolean[];
  set4Feel: WarmupFeel | null;
  set5Feel: WarmupFeel | null;
  onCheckSet: (index: number) => void;
  onSet4Feel: (feel: WarmupFeel) => void;
  onSet5Feel: (feel: WarmupFeel) => void;
  onComplete: () => void;
  onClose: () => void;
}

const FEELS: WarmupFeel[] = ['easy', 'good', 'bad'];

/**
 * Focused, one-set-at-a-time warm-up: step through the fixed sets, rate the
 * 82% set and the approach single, and land on the adjusted working weight.
 * Progress lives in the parent (checks, feels), so closing mid-flow loses
 * nothing — reopening resumes where you left off.
 */
export default function WarmupFlow({
  warmup,
  plannedWeight,
  adjustedWeight,
  unit,
  availablePlates,
  warmupChecks,
  set4Feel,
  set5Feel,
  onCheckSet,
  onSet4Feel,
  onSet5Feel,
  onComplete,
  onClose,
}: WarmupFlowProps) {
  const fixedCount = warmup.fixedSets.length;

  // Resume: first unchecked fixed set, else approach, else the final card
  const initialStep = (() => {
    if (set5Feel) return fixedCount + 1;
    const firstUnchecked = warmup.fixedSets.findIndex((_, idx) => !warmupChecks[idx]);
    if (firstUnchecked === -1) return set4Feel ? fixedCount : fixedCount - 1;
    return firstUnchecked;
  })();

  const [step, setStep] = useState(initialStep);
  const barWeight = BAR_WEIGHTS[unit] ?? BAR_WEIGHTS.lb;

  const isFixedStep = step < fixedCount;
  const isApproachStep = step === fixedCount;
  const isFinalStep = step > fixedCount;
  const lastFixedIndex = fixedCount - 1;

  const advanceFromFixed = (index: number) => {
    // Skipping the 82% feel skips the approach too — no feel, no adjustment
    if (index === lastFixedIndex && !set4Feel) {
      setStep(fixedCount + 1);
    } else {
      setStep(index + 1);
    }
  };

  const currentFixed = isFixedStep ? warmup.fixedSets[step] : null;
  const approachWeight = set4Feel ? warmup.getApproachWeight(set4Feel) : null;
  const finalWeight = adjustedWeight ?? plannedWeight;

  return (
    <AccessibleModal
      isOpen
      onClose={onClose}
      title="Warm-up"
      description="Step through your warm-up sets one at a time. Progress is saved as you go."
      fullScreen
    >
      <div className="space-y-6 pb-2">
        {isFixedStep && currentFixed && (
          <>
            <div className="text-center">
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Set {step + 1} of {fixedCount} — {currentFixed.percentage === 0 ? 'Empty bar' : `${currentFixed.percentage}%`}
              </p>
              <p className="text-4xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                {currentFixed.weight}
                <span className="text-lg font-semibold text-gray-400 dark:text-gray-400"> {unit} × {currentFixed.reps}</span>
              </p>
            </div>

            <PlateVisual
              targetWeight={currentFixed.weight}
              barWeight={barWeight}
              availablePlates={availablePlates}
              unit={unit}
            />

            {step === lastFixedIndex ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 text-center">
                  How did the {currentFixed.percentage}% set feel?
                </p>
                <div className="flex gap-2">
                  {FEELS.map(feel => (
                    <Button
                      key={feel}
                      variant="tertiary"
                      size="sm"
                      className="flex-1 py-2.5 capitalize"
                      onClick={() => {
                        onCheckSet(step);
                        onSet4Feel(feel);
                        setStep(fixedCount);
                      }}
                    >
                      {feel.charAt(0).toUpperCase() + feel.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Button
                fullWidth
                onClick={() => {
                  onCheckSet(step);
                  advanceFromFixed(step);
                }}
              >
                Done — next set
              </Button>
            )}

            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Back
              </Button>
              <Button variant="ghost" size="sm" onClick={() => advanceFromFixed(step)}>
                Skip
              </Button>
            </div>
          </>
        )}

        {isApproachStep && approachWeight && (
          <>
            <div className="text-center">
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Approach Single
              </p>
              <p className="text-4xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                {approachWeight}
                <span className="text-lg font-semibold text-gray-400 dark:text-gray-400"> {unit} × 1</span>
              </p>
            </div>

            <PlateVisual
              targetWeight={approachWeight}
              barWeight={barWeight}
              availablePlates={availablePlates}
              unit={unit}
            />

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 text-center">
                How did the approach feel?
              </p>
              <div className="flex gap-2">
                {FEELS.map(feel => (
                  <Button
                    key={feel}
                    variant="tertiary"
                    size="sm"
                    className="flex-1 py-2.5 capitalize"
                    onClick={() => {
                      onSet5Feel(feel);
                      setStep(fixedCount + 1);
                    }}
                  >
                    {feel.charAt(0).toUpperCase() + feel.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(lastFixedIndex)}>
                Back
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep(fixedCount + 1)}>
                Skip
              </Button>
            </div>
          </>
        )}

        {isFinalStep && (
          <>
            <div className="text-center">
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
                {adjustedWeight != null ? 'Your Working Weight' : 'Planned Working Weight'}
              </p>
              <p className="text-4xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                {finalWeight}
                <span className="text-lg font-semibold text-gray-400 dark:text-gray-400"> {unit}</span>
              </p>
              {adjustedWeight != null && adjustedWeight !== plannedWeight && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {adjustedWeight > plannedWeight ? '+' : ''}{adjustedWeight - plannedWeight} {unit} from planned — adjusted for today.
                </p>
              )}
            </div>

            <PlateVisual
              targetWeight={finalWeight}
              barWeight={barWeight}
              availablePlates={availablePlates}
              unit={unit}
            />

            <Button fullWidth onClick={onComplete}>
              Start Working Sets
            </Button>
          </>
        )}
      </div>
    </AccessibleModal>
  );
}
