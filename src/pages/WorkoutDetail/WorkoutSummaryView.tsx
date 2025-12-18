import { useState, useEffect } from 'react';
import { Edit2, Save, X, RotateCcw, Plus } from 'lucide-react';
import { Exercise } from './types';
import EditableExerciseList from '../../components/features/EditableExerciseList';
import AddExerciseModal from '../../components/features/AddExerciseModal';
import ExerciseSubstitutionModal from '../../components/features/ExerciseSubstitutionModal';

interface WorkoutSummaryViewProps {
  mainWeights: { set1: number; set2: number; set3: number };
  mainReps: string | number;
  exercises: Exercise[];
  onStartWorkout: () => void;
  programVariation?: 'standard' | 'bbb' | 'bbs';
  supplementalWeight?: number;
  supplementalConfig?: { sets: number; reps: number } | null;
  onSaveExercises?: (exercises: Exercise[]) => Promise<boolean>;
  onResetExercises?: () => Promise<boolean>;
  availableExercises?: Exercise[];
  isSaving?: boolean;
  saveError?: string | null;
}

export default function WorkoutSummaryView({
  mainWeights,
  mainReps,
  exercises,
  onStartWorkout,
  programVariation = 'standard',
  supplementalWeight = 0,
  supplementalConfig = null,
  onSaveExercises,
  onResetExercises,
  availableExercises = [],
  isSaving = false,
  saveError = null,
}: WorkoutSummaryViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedExercises, setEditedExercises] = useState<Exercise[]>(exercises);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ index: number; name: string } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setEditedExercises(exercises);
  }, [exercises]);

  const announce = (message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setEditedExercises(exercises);
    announce('Edit mode active. You can now modify your accessory exercises.');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedExercises(exercises);
    announce('Edit mode cancelled. Changes discarded.');
  };

  const handleSaveChanges = async () => {
    if (!onSaveExercises) return;

    const success = await onSaveExercises(editedExercises);
    if (success) {
      setIsEditMode(false);
      announce('Workout template saved successfully.');
    } else {
      announce('Failed to save workout template. Please try again.');
    }
  };

  const handleResetToDefault = async () => {
    if (!onResetExercises) return;

    if (confirm('Are you sure you want to reset to the default exercises? This cannot be undone.')) {
      const success = await onResetExercises();
      if (success) {
        setIsEditMode(false);
        announce('Workout template reset to defaults.');
      } else {
        announce('Failed to reset workout template. Please try again.');
      }
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (editedExercises.length >= 7) {
      announce('Cannot add more exercises. Maximum of 7 accessories reached.');
      return;
    }

    const newExercises = [...editedExercises, exercise];
    setEditedExercises(newExercises);
    announce(`${exercise.name} added. ${newExercises.length} of 7 exercises.`);
  };

  const handleSubstituteExercise = (index: number, exerciseName: string) => {
    setSubstitutionTarget({ index, name: exerciseName });
    setShowSubstitutionModal(true);
  };

  const handleConfirmSubstitution = (newExerciseName: string) => {
    if (substitutionTarget === null) return;

    const newExercises = [...editedExercises];
    const originalExercise = newExercises[substitutionTarget.index];
    newExercises[substitutionTarget.index] = {
      ...originalExercise,
      name: newExerciseName,
    };

    setEditedExercises(newExercises);
    announce(`${originalExercise.name} substituted with ${newExerciseName}.`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveChanges();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, editedExercises]);

  const canEdit = !!onSaveExercises && !!onResetExercises;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div
        className="sr-only"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        {announcement}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Main Sets</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="font-medium text-gray-700 dark:text-gray-300">Set 1</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{mainWeights.set1} lb × {mainReps}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="font-medium text-gray-700 dark:text-gray-300">Set 2</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{mainWeights.set2} lb × {mainReps}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 border-2 border-blue-600 dark:border-blue-500">
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">Set 3 - AMRAP</span>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">As Many Reps As Possible</p>
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100">{mainWeights.set3} lb × {mainReps}+</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">Push yourself on this final set!</p>
        </div>
      </div>

      {supplementalConfig && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {programVariation === 'bbb' ? 'Boring But Big' : 'Boring But Strong'}
            </h2>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
              {programVariation?.toUpperCase()}
            </span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              {programVariation === 'bbb'
                ? 'Complete 5 sets of 10 reps at 50% of your Training Max'
                : 'Complete 10 sets of 5 reps at First Set Last weight'}
            </p>
            <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
              <span className="font-medium text-blue-900 dark:text-blue-100">Supplemental Work</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">
                {supplementalWeight} lb × {supplementalConfig.reps} reps × {supplementalConfig.sets} sets
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accessory Exercises</h2>
          {canEdit && !isEditMode && (
            <button
              type="button"
              onClick={handleEnterEditMode}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              aria-label="Edit accessory exercises. Press Enter or Space to activate."
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">Edit</span>
            </button>
          )}
        </div>

        {saveError && (
          <div
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
          </div>
        )}

        {isEditMode ? (
          <div className="space-y-4">
            <EditableExerciseList
              exercises={editedExercises}
              onExercisesChange={setEditedExercises}
              onSubstituteExercise={handleSubstituteExercise}
              maxExercises={7}
            />

            {editedExercises.length < 7 && (
              <button
                type="button"
                onClick={() => setShowAddExerciseModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                aria-label={`Add exercise. ${editedExercises.length} of 7 slots used.`}
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">Add Exercise</span>
              </button>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                aria-label="Reset to default exercises"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">Reset</span>
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                aria-label="Cancel editing. Press Escape as shortcut."
              >
                <X className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving || editedExercises.length === 0}
                className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                aria-label="Save changes. Press Ctrl+S or Cmd+S as shortcut."
              >
                <Save className="w-4 h-4 inline mr-2" aria-hidden="true" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-900 dark:text-gray-100 font-medium">{exercise.name}</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{exercise.reps}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isEditMode && (
        <button
          onClick={onStartWorkout}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
        >
          Start Workout
        </button>
      )}

      {showAddExerciseModal && (
        <AddExerciseModal
          isOpen={showAddExerciseModal}
          onClose={() => setShowAddExerciseModal(false)}
          onAddExercise={handleAddExercise}
          existingExercises={editedExercises}
          availableExercises={availableExercises}
          maxExercises={7}
        />
      )}

      {showSubstitutionModal && substitutionTarget && (
        <ExerciseSubstitutionModal
          isOpen={showSubstitutionModal}
          onClose={() => setShowSubstitutionModal(false)}
          currentExercise={substitutionTarget.name}
          onSubstitute={handleConfirmSubstitution}
          availableExercises={availableExercises}
        />
      )}
    </div>
  );
}
