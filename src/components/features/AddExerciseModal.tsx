import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Exercise } from '../../lib/types';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
  existingExercises: Exercise[];
  availableExercises: Exercise[];
  maxExercises: number;
}

export default function AddExerciseModal({
  isOpen,
  onClose,
  onAddExercise,
  existingExercises,
  availableExercises,
  maxExercises,
}: AddExerciseModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customExercise, setCustomExercise] = useState({
    name: '',
    reps: '8-12',
    sets: 3,
    isBodyweight: false,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedExercise(null);
      setShowCustomInput(false);
      setCustomExercise({ name: '', reps: '8-12', sets: 3, isBodyweight: false });
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const existingExerciseNames = new Set(existingExercises.map(ex => ex.name.toLowerCase()));
  const filteredExercises = availableExercises.filter(
    ex => !existingExerciseNames.has(ex.name.toLowerCase()) &&
      ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddExercise = (exercise: Exercise) => {
    if (existingExercises.length >= maxExercises) {
      return;
    }

    onAddExercise(exercise);
    onClose();
  };

  const handleAddCustomExercise = () => {
    if (!customExercise.name.trim()) return;

    if (existingExerciseNames.has(customExercise.name.trim().toLowerCase())) {
      return;
    }

    handleAddExercise({
      name: customExercise.name.trim(),
      reps: customExercise.reps,
      sets: customExercise.sets,
      isBodyweight: customExercise.isBodyweight,
    });
  };

  const remainingSlots = maxExercises - existingExercises.length;

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Exercise"
      description={`Add an exercise to your workout (${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining)`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-5 h-5 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            ref={searchInputRef}
            id="exercise-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an exercise..."
            className="pl-10 pr-4"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls="exercise-list"
            aria-label="Search exercises"
          />
        </div>

        {filteredExercises.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Available Exercises ({filteredExercises.length})
            </h3>
            <div
              id="exercise-list"
              role="list"
              className="space-y-2 max-h-80 overflow-y-auto"
            >
              {filteredExercises.map((exercise, index) => (
                <button
                  key={`${exercise.name}-${index}`}
                  type="button"
                  onClick={() => handleAddExercise(exercise)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedExercise?.name === exercise.name
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
                  onFocus={() => setSelectedExercise(exercise)}
                  role="listitem"
                  aria-label={`Add ${exercise.name}, ${exercise.sets} sets of ${exercise.reps} reps${exercise.isBodyweight ? ', bodyweight exercise' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {exercise.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {exercise.sets} sets × {exercise.reps} reps
                        {exercise.isBodyweight && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Bodyweight
                          </span>
                        )}
                      </p>
                    </div>
                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : searchQuery ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No exercises found matching "{searchQuery}"
            </p>
          </div>
        ) : null}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
              showCustomInput
                ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
            aria-expanded={showCustomInput}
            aria-controls="custom-exercise-form"
          >
            {showCustomInput ? (
              <>
                <X className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Cancel Custom Exercise</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Add Custom Exercise</span>
              </>
            )}
          </button>

          {showCustomInput && (
            <div id="custom-exercise-form" className="mt-4 space-y-4">
              <div>
                <label htmlFor="custom-exercise-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Exercise Name <span className="text-red-600" aria-label="required">*</span>
                </label>
                <input
                  id="custom-exercise-name"
                  type="text"
                  value={customExercise.name}
                  onChange={(e) => setCustomExercise({ ...customExercise, name: e.target.value })}
                  placeholder="Enter exercise name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  required
                  aria-required="true"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="custom-exercise-reps" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Reps
                  </label>
                  <input
                    id="custom-exercise-reps"
                    type="text"
                    value={customExercise.reps}
                    onChange={(e) => setCustomExercise({ ...customExercise, reps: e.target.value })}
                    placeholder="8-12"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="custom-exercise-sets" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Sets
                  </label>
                  <input
                    id="custom-exercise-sets"
                    type="number"
                    min="1"
                    max="10"
                    value={customExercise.sets}
                    onChange={(e) => setCustomExercise({ ...customExercise, sets: parseInt(e.target.value) || 3 })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="custom-exercise-bodyweight"
                  type="checkbox"
                  checked={customExercise.isBodyweight}
                  onChange={(e) => setCustomExercise({ ...customExercise, isBodyweight: e.target.checked })}
                  className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <label htmlFor="custom-exercise-bodyweight" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bodyweight exercise
                </label>
              </div>

              <Button
                type="button"
                fullWidth
                size="md"
                onClick={handleAddCustomExercise}
                disabled={!customExercise.name.trim() || existingExercises.length >= maxExercises}
              >
                Add Custom Exercise
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </AccessibleModal>
  );
}
