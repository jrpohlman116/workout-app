import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import { Trash2, Plus } from 'lucide-react';
import type { SetInput } from '../../lib/types';

interface AccessibleFormGroupProps {
  legend: string;
  description?: string;
  sets: SetInput[];
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  repsLabel?: string;
  weightLabel?: string;
  weightUnit?: string;
  repsPlaceholder?: string;
  weightPlaceholder?: string;
  minSets?: number;
  maxSets?: number;
  isBodyweight?: boolean;
  lastSetData?: string;
}

export default function AccessibleFormGroup({
  legend,
  description,
  sets,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  repsLabel = 'Reps',
  weightLabel = 'Weight',
  weightUnit = 'lb',
  repsPlaceholder = '0',
  weightPlaceholder = '0',
  minSets = 1,
  maxSets = 10,
  isBodyweight = false,
  lastSetData
}: AccessibleFormGroupProps) {
  const canAddSet = sets.length < maxSets;
  const canRemoveSet = sets.length > minSets;

  return (
    <fieldset className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4 border-0">
      <legend className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 float-none w-full px-0" style={{ top: '35px', position: 'relative' }}>
        {legend}
      </legend>

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 -mt-2 mb-4">
          {description}
        </p>
      )}

      {lastSetData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Previous Session</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{lastSetData}</p>
        </div>
      )}

      <div className="space-y-3">
        {!isBodyweight && (
          <div className="grid grid-cols-2 gap-4 pl-10">
            <div>
              <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {repsLabel}
              </span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {weightLabel} ({weightUnit})
              </span>
            </div>
          </div>
        )}

        {isBodyweight && (
          <div className="pl-10">
            <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Duration / {repsLabel}
            </span>
          </div>
        )}

        {sets.map((set, index) => {
          const setNumber = index + 1;
          const setId = `set-${index}`;

          return (
            <div
              key={index}
              className="flex items-center gap-3"
              role="group"
              aria-labelledby={`${setId}-label`}
            >
              <span id={`${setId}-label`} className="sr-only">Set {setNumber} of {sets.length}</span>
              <span
                aria-hidden="true"
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-300 flex-shrink-0 tabular-nums select-none"
              >
                {setNumber}
              </span>

              {isBodyweight ? (
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps}
                  onChange={(e) => onUpdateSet(index, 'reps', e.target.value)}
                  placeholder={repsPlaceholder}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                  aria-label={`Set ${setNumber}: ${repsLabel}`}
                  min="0"
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) => onUpdateSet(index, 'reps', e.target.value)}
                    placeholder={repsPlaceholder}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                    aria-label={`Set ${setNumber}: ${repsLabel}`}
                    min="0"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={set.weight}
                    onChange={(e) => onUpdateSet(index, 'weight', e.target.value)}
                    placeholder={weightPlaceholder}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                    aria-label={`Set ${setNumber}: ${weightLabel} in ${weightUnit}`}
                    min="0"
                  />
                </div>
              )}

              {canRemoveSet && (
                <IconButton
                  label={`Remove set ${setNumber}`}
                  variant="danger"
                  className="p-3"
                  onClick={() => onRemoveSet(index)}
                >
                  <Trash2 className="w-5 h-5" />
                </IconButton>
              )}
            </div>
          );
        })}
      </div>

      {canAddSet && (
        <Button
          type="button"
          variant="dashed"
          size="md"
          fullWidth
          icon={<Plus className="w-5 h-5" />}
          onClick={onAddSet}
          disabled={!canAddSet}
          aria-label={`Add another set (${sets.length} of ${maxSets} sets used)`}
        >
          Add Set
        </Button>
      )}

      {!canAddSet && (
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          Maximum of {maxSets} sets reached
        </p>
      )}
    </fieldset>
  );
}
