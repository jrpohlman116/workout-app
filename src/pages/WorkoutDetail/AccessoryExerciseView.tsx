import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Exercise, SetInput } from './types';

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{exercise.name}</h2>
            {substitutedFrom && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Substituted from: {substitutedFrom}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {exercise.sets} sets of {exercise.reps} reps
            </p>
          </div>
          <button
            onClick={onSubstitute}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex-shrink-0"
            aria-label="Substitute exercise"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Substitute</span>
          </button>
        </div>

        {lastSetData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-500 rounded-r-lg px-4 py-3 mb-4">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Previous Session</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{lastSetData}</p>
          </div>
        )}

        <div className="space-y-3">
          {!exercise.isBodyweight && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Reps
                </span>
              </div>
              <div>
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Weight ({unitPreference})
                </span>
              </div>
            </div>
          )}

          {exercise.isBodyweight && (
            <div>
              <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                className="flex gap-2"
                role="group"
                aria-labelledby={`${setId}-label`}
              >
                <span id={`${setId}-label`} className="sr-only">
                  Set {setNumber} of {exerciseSets.length}
                </span>

                {exercise.isBodyweight ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) => onUpdateSet(index, 'reps', e.target.value)}
                    placeholder={exercise.reps}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                    aria-label={`Set ${setNumber}: Reps`}
                    min="0"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(e) => onUpdateSet(index, 'reps', e.target.value)}
                      placeholder={exercise.reps}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
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
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                      aria-label={`Set ${setNumber}: Weight in ${unitPreference}`}
                      min="0"
                    />
                  </div>
                )}

                {exerciseSets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSet(index)}
                    className="p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                    aria-label={`Remove set ${setNumber}`}
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
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
            className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            aria-label={`Add another set (${exerciseSets.length} of 10 sets used)`}
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Add Set</span>
          </button>
        )}

        {exerciseSets.length >= 10 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center mt-4">
            Maximum of 10 sets reached
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onPrevious}
          className="flex-1 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 py-4 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={saving}
          className={`flex-1 py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
            nextExerciseName
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600'
              : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
          }`}
        >
          {nextExerciseName ? `Next: ${nextExerciseName}` : saving ? 'Saving...' : 'Complete Workout'}
        </button>
      </div>
    </div>
  );
}
