import { useState } from 'react';
import { Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import PlateVisual from './PlateVisual';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { getRoundingIncrement, BAR_WEIGHTS } from '../../lib/calculations';
import { RPE_OPTIONS } from '../../lib/constants';

interface WorkingSetModalProps {
  setNumber: number;
  totalSets: number;
  initialReps: string;
  initialWeight: string;
  /** Previously logged RPE/bar speed for this set, if any — both optional. */
  initialRpe?: string;
  initialVbt?: string;
  /** Rep prescription for the hint line, e.g. "10" or "10+" for AMRAP. */
  repsTarget: string;
  isAmap: boolean;
  unit: string;
  availablePlates: number[];
  onSave: (reps: string, weight: string, rpe: string, vbt: string) => void;
  onClose: () => void;
}

/**
 * Focused logging view for one working set: live plate visual, weight and
 * rep steppers (typing works too), plus optional RPE and bar-speed (VBT)
 * inputs tucked behind a collapsed toggle to keep the default flow fast.
 * Saving commits the values and marks the set done — which is what starts
 * the rest timer.
 */
export default function WorkingSetModal({
  setNumber,
  totalSets,
  initialReps,
  initialWeight,
  initialRpe = '',
  initialVbt = '',
  repsTarget,
  isAmap,
  unit,
  availablePlates,
  onSave,
  onClose,
}: WorkingSetModalProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState(initialRpe);
  const [vbt, setVbt] = useState(initialVbt);
  const [showMetrics, setShowMetrics] = useState(!!(initialRpe || initialVbt));
  const roundTo = getRoundingIncrement(unit);
  const barWeight = BAR_WEIGHTS[unit] ?? BAR_WEIGHTS.lb;

  const handleVbtChange = (v: string) => {
    if (v === '') { setVbt(''); return; }
    const parsed = parseFloat(v);
    if (isNaN(parsed) || parsed < 0) return;
    setVbt(v);
  };

  const weightNum = parseFloat(weight) || 0;
  const repsNum = parseInt(reps) || 0;

  const stepWeight = (dir: 1 | -1) => {
    const next = Math.max(0, weightNum + dir * roundTo);
    setWeight(next ? String(next) : '');
  };

  const stepReps = (dir: 1 | -1) => {
    const next = Math.max(0, repsNum + dir);
    setReps(next ? String(next) : '');
  };

  // Typing bypasses the steppers entirely, so it needs its own floor — an
  // invalid or negative keystroke is dropped rather than committed, which
  // also has the effect of resetting the (now-stale) controlled input back
  // to its last valid value.
  const handleWeightChange = (v: string) => {
    if (v === '') { setWeight(''); return; }
    const parsed = parseFloat(v);
    if (isNaN(parsed) || parsed < 0) return;
    setWeight(v);
  };

  const handleRepsChange = (v: string) => {
    if (v === '') { setReps(''); return; }
    const parsed = parseInt(v);
    if (isNaN(parsed) || parsed < 0) return;
    setReps(v);
  };

  const stepperRow = (
    label: string,
    value: string,
    suffix: string | null,
    onMinus: () => void,
    onPlus: () => void,
    onChange: (v: string) => void,
    inputMode: 'decimal' | 'numeric'
  ) => (
    <div>
      <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 text-center mb-2">{label}</p>
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-12 h-12 p-0 flex items-center justify-center rounded-full"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={onMinus}
        >
          <Minus className="w-5 h-5" aria-hidden="true" />
        </Button>
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            inputMode={inputMode}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="w-28 text-center text-display-lg tabular-nums bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min="0"
          />
          {suffix && <span className="text-body-lg-semibold text-gray-400 dark:text-gray-400">{suffix}</span>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-12 h-12 p-0 flex items-center justify-center rounded-full"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={onPlus}
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );

  return (
    <AccessibleModal
      isOpen
      onClose={onClose}
      title={`Set ${setNumber} of ${totalSets}`}
      description="Log the weight and reps for this set."
      fullScreen
    >
      <div className="space-y-6 pb-2">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {isAmap
            ? `AMRAP set — target ${repsTarget}. Log every rep you got.`
            : `Prescribed: ${repsTarget} reps.`}
        </p>

        {weightNum > 0 && (
          <PlateVisual
            targetWeight={weightNum}
            barWeight={barWeight}
            availablePlates={availablePlates}
            unit={unit}
          />
        )}

        {stepperRow('Weight', weight, unit, () => stepWeight(-1), () => stepWeight(1), handleWeightChange, 'decimal')}
        {stepperRow('Reps', reps, null, () => stepReps(-1), () => stepReps(1), handleRepsChange, 'numeric')}

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth
            icon={showMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            onClick={() => setShowMetrics(v => !v)}
            aria-expanded={showMetrics}
          >
            RPE / bar speed (optional)
          </Button>

          {showMetrics && (
            <div className="space-y-4 pt-3">
              <div>
                <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 text-center mb-2">RPE</p>
                <div className="flex gap-2">
                  {RPE_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={rpe === String(option) ? 'primary' : 'ghost'}
                      size="sm"
                      fullWidth
                      onClick={() => setRpe(rpe === String(option) ? '' : String(option))}
                      aria-pressed={rpe === String(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <Input
                id="vbt-input"
                label="Bar Speed (m/s)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={vbt}
                onChange={(e) => handleVbtChange(e.target.value)}
                placeholder="e.g. 0.45"
                className="text-center text-lg font-bold tabular-nums"
              />
            </div>
          )}
        </div>

        <Button fullWidth onClick={() => onSave(reps, weight, rpe, vbt)}>
          Log Set
        </Button>
      </div>
    </AccessibleModal>
  );
}
