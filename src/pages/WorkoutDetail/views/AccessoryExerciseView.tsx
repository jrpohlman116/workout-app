import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Exercise, SetInput } from '../../../lib/types';
import Card from '../../../components/ui/Card';

interface AccessoryExerciseViewProps {
  exercise: Exercise;
  exerciseSets: SetInput[];
  unitPreference: string;
  lastSetData: string;
  substitutedFrom?: string;
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
  substitutedFrom,
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
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {exercise.sets}×{exercise.reps}
            </p>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">{exercise.name}</h2>
            {substitutedFrom && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">from {substitutedFrom}</p>
            )}
          </div>
          <button
            onClick={onSubstitute}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Substitute exercise"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs font-medium">Sub</span>
          </button>
        </div>

        {lastSetData && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">Last Session</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">{lastSetData}</p>
          </div>
        )}

        <div className="space-y-3">
          {!exercise.isBodyweight && (
            <div className="grid grid-cols-2 gap-3 pl-10">
              <span className="block text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Reps
              </span>
              <span className="block text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Weight ({unitPreference})
              </span>
            </div>
          )}

          {exercise.isBodyweight && (
            <div className="pl-10">
              <span className="block text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-2">
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
                <span
                  id={`${setId}-label`}
                  className="w-8 text-center font-mono text-sm font-bold text-gray-300 dark:text-gray-600 flex-shrink-0 select-none"
                  aria-hidden="true"
                >
                  {String(setNumber).padStart(2, '0')}
                </span>
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
                      placeholder="0"
                      className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                      aria-label={`Set ${setNumber}: Weight in ${unitPreference}`}
                      min="0"
                    />
                  </div>
                )}

                {exerciseSets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSet(index)}
                    className="p-3 text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                    aria-label={`Remove set ${setNumber}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {exerciseSets.length < 10 && (
          <button
            type="button"
            onClick={onAddSet}
            className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            aria-label={`Add another set (${exerciseSets.length} of 10 sets used)`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">Add Set</span>
          </button>
        )}

        {exerciseSets.length >= 10 && (
          <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-600 text-center mt-4">
            Max 10 sets
          </p>
        )}
      </Card>

      <div className="flex gap-3">
        <button
          onClick={onPrevious}
          disabled={saving}
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={saving}
          className="flex-1 bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 dark:hover:bg-blue-400 active:bg-blue-700 dark:active:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextExerciseName ? `Next: ${nextExerciseName}` : saving ? 'Saving...' : 'Complete Workout'}
        </button>
      </div>
    </div>
  );
}
