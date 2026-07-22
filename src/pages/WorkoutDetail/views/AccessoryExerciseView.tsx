import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Exercise, SetInput } from '../../../lib/types';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import IconButton from '../../../components/ui/IconButton';
import SetCheck from '../../../components/ui/SetCheck';

interface AccessoryExerciseViewProps {
  exercise: Exercise;
  exerciseSets: SetInput[];
  unitPreference: string;
  lastSetData: string;
  suggestedWeight?: { low: number; high: number } | null;
  substitutedFrom?: string;
  setChecks?: boolean[];
  onToggleSetCheck?: (index: number) => void;
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  onSubstitute: () => void;
  onPrevious: () => void;
  onNext: () => void;
  nextExerciseName: string | null;
  saving: boolean;
}

export default function AccessoryExerciseView({
  exercise,
  exerciseSets,
  unitPreference,
  lastSetData,
  suggestedWeight,
  substitutedFrom,
  setChecks,
  onToggleSetCheck,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onSubstitute,
  onPrevious,
  onNext,
  nextExerciseName,
  saving,
}: AccessoryExerciseViewProps) {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {exercise.sets}×{exercise.reps}
            </p>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">{exercise.name}</h2>
            {substitutedFrom && (
              <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">from {substitutedFrom}</p>
            )}
          </div>
          <Button
            variant="tertiary"
            size="sm"
            className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
            onClick={onSubstitute}
            aria-label="Substitute exercise"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs font-medium">Sub</span>
          </Button>
        </div>

        {lastSetData && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">Last Session</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">{lastSetData}</p>
          </div>
        )}

        <div className="space-y-3">
          {!exercise.isBodyweight && (
            <div className="grid grid-cols-2 gap-3 pl-10">
              <span className="block text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Reps
              </span>
              <span className="block text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Weight ({unitPreference})
              </span>
            </div>
          )}

          {exercise.isBodyweight && (
            <div className="pl-10">
              <span className="block text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Duration / Reps
              </span>
            </div>
          )}

          {exerciseSets.map((set, index) => {
            const setNumber = index + 1;
            const setId = `set-${index}`;

            return (
              <div
                key={index}
                className="flex items-center gap-2"
                role="group"
                aria-labelledby={`${setId}-label`}
              >
                {onToggleSetCheck ? (
                  <SetCheck
                    checked={!!setChecks?.[index]}
                    label={setChecks?.[index] ? `Set ${setNumber} done — tap to undo` : `Mark set ${setNumber} done`}
                    display={String(setNumber).padStart(2, '0')}
                    onToggle={() => onToggleSetCheck(index)}
                  />
                ) : (
                  <span
                    id={`${setId}-label`}
                    className="w-8 text-center font-mono text-sm font-bold text-gray-300 dark:text-gray-400 flex-shrink-0 select-none"
                    aria-hidden="true"
                  >
                    {String(setNumber).padStart(2, '0')}
                  </span>
                )}
                <span className="sr-only">Set {setNumber} of {exerciseSets.length}</span>

                {exercise.isBodyweight ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) => onUpdateSet(index, 'reps', e.target.value)}
                    placeholder={exercise.reps}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                    aria-label={`Set ${setNumber}: Reps`}
                    min="0"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(e) => onUpdateSet(index, 'reps', e.target.value)}
                      placeholder={exercise.reps}
                      className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                      aria-label={`Set ${setNumber}: Reps`}
                      min="0"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={set.weight}
                      onChange={(e) => onUpdateSet(index, 'weight', e.target.value)}
                      placeholder={suggestedWeight ? `${suggestedWeight.low}-${suggestedWeight.high}` : '0'}
                      className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                      aria-label={`Set ${setNumber}: Weight in ${unitPreference}`}
                      min="0"
                    />
                  </div>
                )}

                {exerciseSets.length > 1 && (
                  <IconButton
                    variant="danger"
                    label={`Remove set ${setNumber}`}
                    onClick={() => onRemoveSet(index)}
                    className="p-3"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </IconButton>
                )}
              </div>
            );
          })}
        </div>

        {exerciseSets.length < 10 && (
          <Button
            type="button"
            variant="dashed"
            size="md"
            fullWidth
            icon={<Plus className="w-4 h-4" />}
            onClick={onAddSet}
            aria-label={`Add another set (${exerciseSets.length} of 10 sets used)`}
            className="mt-4"
          >
            Add Set
          </Button>
        )}

        {exerciseSets.length >= 10 && (
          <p className="text-xs tracking-wide font-semibold text-gray-400 dark:text-gray-400 text-center mt-4">
            Max 10 sets
          </p>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onPrevious}
          disabled={saving}
        >
          Previous
        </Button>
        <Button
          className="flex-1"
          onClick={onNext}
          disabled={saving}
        >
          {nextExerciseName ? `Next: ${nextExerciseName}` : saving ? 'Saving...' : 'Complete Workout'}
        </Button>
      </div>
    </div>
  );
}
