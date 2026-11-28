import { useState } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { estimateMaxFromPerformance, type MaxEstimate } from '../../lib/programs/maxes';

interface OhpMaxPromptProps {
  unit: string;
  saving?: boolean;
  error?: string | null;
  onSave: (estimate: MaxEstimate) => void;
  onDismiss: () => void;
}

/**
 * Shown on the overhead press day until the user has a max. Estimates one from
 * a recent hard set so the day can prescribe a top set; the user confirms
 * before anything is saved.
 */
export default function OhpMaxPrompt({ unit, saving = false, error, onSave, onDismiss }: OhpMaxPromptProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const estimate = estimateMaxFromPerformance(w, r, unit, 'ohp');
  const tooManyReps = r > 12;

  return (
    <div className="max-w-md mx-auto px-4 pt-4">
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-body-lg-bold text-gray-900 dark:text-gray-100">Set your overhead press max</h2>
          <p className="text-body-sm text-gray-600 dark:text-gray-300 mt-1">
            You don't have an overhead press max yet. Enter a recent hard set and we'll estimate it, so this
            day can give you a top set. You can change it any time in Profile.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Weight (${unit})`}
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            min="0"
            step="0.5"
            placeholder="e.g. 95"
          />
          <Input
            label="Reps"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => setReps(e.target.value)}
            min="1"
            max="12"
            step="1"
            placeholder="e.g. 5"
            hint={tooManyReps ? 'Use a set of 12 reps or fewer.' : undefined}
          />
        </div>

        <p className="text-body-sm text-gray-700 dark:text-gray-200 min-h-[1.25rem]" aria-live="polite">
          {estimate
            ? <>Estimated 1RM <span className="font-semibold">{estimate.estimated1RM} {unit}</span> · training max <span className="font-semibold">{estimate.trainingMax} {unit}</span></>
            : ''}
        </p>

        {error && <p role="alert" className="text-body-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onDismiss} disabled={saving}>
            Not now
          </Button>
          <Button size="md" className="flex-1" disabled={!estimate || saving} onClick={() => estimate && onSave(estimate)}>
            {saving ? 'Saving…' : 'Save max'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
