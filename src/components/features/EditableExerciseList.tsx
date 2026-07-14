import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, RefreshCw } from 'lucide-react';
import { Exercise } from '../../lib/types';
import IconButton from '../ui/IconButton';

interface EditableExerciseListProps {
  exercises: Exercise[];
  onExercisesChange: (exercises: Exercise[]) => void;
  onSubstituteExercise: (index: number, exerciseName: string) => void;
  maxExercises?: number;
}

export default function EditableExerciseList({
  exercises,
  onExercisesChange,
  onSubstituteExercise,
  maxExercises = 7,
}: EditableExerciseListProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const exerciseRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    exerciseRefs.current = exerciseRefs.current.slice(0, exercises.length);
  }, [exercises.length]);

  const announce = (message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === exercises.length - 1) return;

    const newExercises = [...exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];

    onExercisesChange(newExercises);

    const movedExercise = newExercises[targetIndex];
    announce(`${movedExercise.name} moved ${direction}. Now in position ${targetIndex + 1} of ${newExercises.length}`);

    setTimeout(() => {
      exerciseRefs.current[targetIndex]?.focus();
      setFocusedIndex(targetIndex);
    }, 0);
  };

  const removeExercise = (index: number) => {
    if (exercises.length <= 1) {
      announce('Cannot remove the last exercise. At least one exercise is required.');
      return;
    }

    const removedExercise = exercises[index];
    const newExercises = exercises.filter((_, i) => i !== index);
    onExercisesChange(newExercises);

    announce(`${removedExercise.name} removed. ${newExercises.length} exercises remaining.`);

    const nextIndex = Math.min(index, newExercises.length - 1);
    setTimeout(() => {
      exerciseRefs.current[nextIndex]?.focus();
      setFocusedIndex(nextIndex);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey || e.metaKey) {
          moveExercise(index, 'up');
        } else if (index > 0) {
          exerciseRefs.current[index - 1]?.focus();
          setFocusedIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (e.altKey || e.metaKey) {
          moveExercise(index, 'down');
        } else if (index < exercises.length - 1) {
          exerciseRefs.current[index + 1]?.focus();
          setFocusedIndex(index + 1);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (e.shiftKey) {
          e.preventDefault();
          removeExercise(index);
        }
        break;
    }
  };

  const remainingSlots = maxExercises - exercises.length;

  return (
    <div className="space-y-4">
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Accessory Exercises
        </h3>
        <div
          className="text-sm text-gray-600 dark:text-gray-400"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium">{exercises.length}</span> of {maxExercises}
          {remainingSlots > 0 && (
            <span className="ml-2 text-xs">
              ({remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining)
            </span>
          )}
        </div>
      </div>

      <div
        role="list"
        aria-label="Accessory exercises list"
        className="space-y-2"
      >
        {exercises.map((exercise, index) => (
          <div
            key={`${exercise.name}-${index}`}
            ref={(el) => (exerciseRefs.current[index] = el)}
            role="listitem"
            tabIndex={0}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`group bg-gray-50 dark:bg-gray-700 rounded-xl p-4 transition-all ${
              focusedIndex === index
                ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-gray-800'
                : 'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
            }`}
            aria-label={`${exercise.name}, ${exercise.sets} sets of ${exercise.reps} reps. Position ${index + 1} of ${exercises.length}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-300">
                    #{index + 1}
                  </span>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {exercise.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {exercise.sets} sets of {exercise.reps} reps
                  {exercise.isBodyweight && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                      Bodyweight
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <IconButton
                  label={`Move ${exercise.name} up`}
                  onClick={() => moveExercise(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                </IconButton>

                <IconButton
                  label={`Move ${exercise.name} down`}
                  onClick={() => moveExercise(index, 'down')}
                  disabled={index === exercises.length - 1}
                >
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </IconButton>

                <IconButton
                  variant="primary"
                  label={`Substitute ${exercise.name}`}
                  onClick={() => onSubstituteExercise(index, exercise.name)}
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </IconButton>

                <IconButton
                  variant="danger"
                  label={`Remove ${exercise.name}`}
                  onClick={() => removeExercise(index)}
                  disabled={exercises.length <= 1}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <span className="font-semibold">Keyboard shortcuts:</span> Arrow keys to navigate,
          Alt+Arrow keys to reorder, Shift+Delete to remove
        </p>
      </div>
    </div>
  );
}
