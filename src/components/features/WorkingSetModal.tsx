import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import PlateVisual from './PlateVisual';
import Button from '../ui/Button';
import { getRoundingIncrement, BAR_WEIGHTS } from '../../lib/calculations';

interface WorkingSetModalProps {
  setNumber: number;
  totalSets: number;
  initialReps: string;
  initialWeight: string;
  /** Rep prescription for the hint line, e.g. "10" or "10+" for AMAP. */
  repsTarget: string;
  isAmap: boolean;
  unit: string;
  availablePlates: number[];
  onSave: (reps: string, weight: string) => void;
  onClose: () => void;
}

/**
 * Focused logging view for one working set: live plate visual, weight and
 * rep steppers (typing works too). Saving commits the values and marks the
 * set done — which is what starts the rest timer. RPE input is deliberately
 * absent for now; it arrives with the RPE-everywhere/VBT roadmap items.
 */
export default function WorkingSetModal({
  setNumber,
  totalSets,
  initialReps,
  initialWeight,
  repsTarget,
  isAmap,
  unit,
  availablePlates,
  onSave,
  onClose,
}: WorkingSetModalProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const roundTo = getRoundingIncrement(unit);
  const barWeight = BAR_WEIGHTS[unit] ?? BAR_WEIGHTS.lb;

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
            className="w-28 text-center text-4xl font-black tabular-nums bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min="0"
          />
          {suffix && <span className="text-lg font-semibold text-gray-400 dark:text-gray-400">{suffix}</span>}
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
            ? `AMAP set — target ${repsTarget}. Log every rep you got.`
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

        {stepperRow('Weight', weight, unit, () => stepWeight(-1), () => stepWeight(1), setWeight, 'decimal')}
        {stepperRow('Reps', reps, null, () => stepReps(-1), () => stepReps(1), setReps, 'numeric')}

        <Button fullWidth onClick={() => onSave(reps, weight)}>
          Log Set
        </Button>
      </div>
    </AccessibleModal>
  );
}
