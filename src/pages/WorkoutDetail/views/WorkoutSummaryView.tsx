import { useState, useEffect } from 'react';
import { Edit2, Save, X, RotateCcw, Plus } from 'lucide-react';
import { Exercise } from '../../../lib/types';
import { JuggernautSetsConfig } from '../../../lib/calculations';
import { PHASE_DETAIL_LABELS, MAX_ACCESSORY_EXERCISES } from '../../../lib/constants';
import EditableExerciseList from '../../../components/features/EditableExerciseList';
import AddExerciseModal from '../../../components/features/AddExerciseModal';
import ExerciseSubstitutionModal from '../../../components/features/ExerciseSubstitutionModal';
import AccessibleModal from '../../../components/accessible/AccessibleModal';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

interface WorkoutSummaryViewProps {
  mainConfig: JuggernautSetsConfig | null;
  exercises: Exercise[];
  /**
   * Raw saved template for Edit mode. `exercises` may be phase-adjusted for
   * display; editing must seed from (and save back) the untransformed list
   * so phase tweaks never get persisted into the template.
   */
  editExercises?: Exercise[];
  phaseNote?: string;
  /** Plain-English note when the main-lift prescription shrank because
      barbell variations of this lift are already planned elsewhere this
      week (weekly-volume redistribution, accumulation/intensification only). */
  mainSetsNote?: string;
  onStartWorkout: () => void;
  unitPreference?: string;
  wave?: number;
  phase?: string;
  onSaveExercises?: (exercises: Exercise[]) => Promise<boolean>;
  onResetExercises?: () => Promise<boolean>;
  availableExercises?: Exercise[];
  isSaving?: boolean;
  saveError?: string | null;
}


export default function WorkoutSummaryView({
  mainConfig,
  exercises,
  editExercises,
  phaseNote,
  mainSetsNote,
  onStartWorkout,
  unitPreference = 'lb',
  wave,
  phase,
  onSaveExercises,
  onResetExercises,
  availableExercises = [],
  isSaving = false,
  saveError = null,
}: WorkoutSummaryViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const templateSource = editExercises ?? exercises;
  const [editedExercises, setEditedExercises] = useState<Exercise[]>(templateSource);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ index: number; name: string } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setEditedExercises(templateSource);
  }, [templateSource]);

  const announce = (message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setEditedExercises(templateSource);
    announce('Edit mode active. You can now modify your accessory exercises.');
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedExercises(templateSource);
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

  const handleResetToDefault = () => {
    if (!onResetExercises) return;
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    if (!onResetExercises) return;
    setShowResetModal(false);
    const success = await onResetExercises();
    if (success) {
      setIsEditMode(false);
      announce('Workout template reset to defaults.');
    } else {
      announce('Failed to reset workout template. Please try again.');
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (editedExercises.length >= MAX_ACCESSORY_EXERCISES) {
      announce(`Cannot add more exercises. Maximum of ${MAX_ACCESSORY_EXERCISES} accessories reached.`);
      return;
    }

    const newExercises = [...editedExercises, exercise];
    setEditedExercises(newExercises);
    announce(`${exercise.name} added. ${newExercises.length} of ${MAX_ACCESSORY_EXERCISES} exercises.`);
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

      {mainConfig && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400">Main Sets</p>
            {wave && (
              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full tabular-nums">
                {wave}-Rep Wave
              </span>
            )}
          </div>
          {phase && (
            <p className="text-xs tracking-wide font-semibold text-gray-400 dark:text-gray-400 mb-4">
              {PHASE_DETAIL_LABELS[phase as keyof typeof PHASE_DETAIL_LABELS] ?? phase}
            </p>
          )}
          <div className="flex justify-between items-center py-4 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400">
                {mainConfig.isAmap
                  ? 'AMAP Set'
                  : `${mainConfig.numSets} sets × ${mainConfig.reps}`}
              </p>
              {mainConfig.isAmap && (
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">Push for max reps after warm-ups</p>
              )}
              {phase === 'deload' && (
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">Easy effort, no grinding</p>
              )}
            </div>
            <p className="text-right gap-2 flex flex-row items-end">
              <span className="text-3xl font-black tabular-nums text-gray-900 dark:text-gray-100 leading-none">
                {mainConfig.weight}
              </span>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-400 mt-1">
                {unitPreference}{mainConfig.isAmap ? ` × ${mainConfig.reps}+` : ''}
              </span>
            </p>
          </div>
          {mainSetsNote && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{mainSetsNote}</p>
          )}
          {mainConfig.downSets && (
            <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mt-2">
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400">
                Down Sets — {mainConfig.downSets.sets} × {mainConfig.downSets.reps}
              </p>
              <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {mainConfig.downSets.weight} <span className="text-xs font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span>
              </p>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accessory Exercises</h2>
          {canEdit && !isEditMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 px-3 py-2.5"
              onClick={handleEnterEditMode}
              aria-label="Edit accessory exercises. Press Enter or Space to activate."
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">Edit</span>
            </Button>
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

        {phaseNote && !isEditMode && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{phaseNote}</p>
        )}

        {isEditMode ? (
          <div className="space-y-4">
            <EditableExerciseList
              exercises={editedExercises}
              onExercisesChange={setEditedExercises}
              onSubstituteExercise={handleSubstituteExercise}
              maxExercises={MAX_ACCESSORY_EXERCISES}
            />

            {editedExercises.length < MAX_ACCESSORY_EXERCISES && (
              <Button
                type="button"
                variant="dashed"
                size="md"
                fullWidth
                icon={<Plus className="w-5 h-5" />}
                onClick={() => setShowAddExerciseModal(true)}
                aria-label={`Add exercise. ${editedExercises.length} of ${MAX_ACCESSORY_EXERCISES} slots used.`}
                className="mt-4"
              >
                Add Exercise
              </Button>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleResetToDefault}
                disabled={isSaving}
                aria-label="Reset to default exercises"
              >
                <RotateCcw className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Reset
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={handleCancelEdit}
                disabled={isSaving}
                aria-label="Cancel editing. Press Escape as shortcut."
              >
                <X className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Cancel
              </Button>

              <Button
                type="button"
                size="md"
                className="flex-1"
                onClick={handleSaveChanges}
                disabled={isSaving || editedExercises.length === 0}
                aria-label="Save changes. Press Ctrl+S or Cmd+S as shortcut."
              >
                <Save className="w-4 h-4 inline mr-2" aria-hidden="true" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
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
      </Card>

      {!isEditMode && (
        <Button
          variant="secondary"
          fullWidth
          onClick={onStartWorkout}
          className="focus:ring-white focus:ring-offset-blue-700 dark:focus:ring-offset-blue-900"
        >
          Start Workout
        </Button>
      )}

      {showAddExerciseModal && (
        <AddExerciseModal
          isOpen={showAddExerciseModal}
          onClose={() => setShowAddExerciseModal(false)}
          onAddExercise={handleAddExercise}
          existingExercises={editedExercises}
          availableExercises={availableExercises}
          maxExercises={MAX_ACCESSORY_EXERCISES}
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

      <AccessibleModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Exercises"
        description="Restore default accessory exercises"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          This replaces your customized exercise list with the default template. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setShowResetModal(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="md"
            className="flex-1"
            onClick={handleConfirmReset}
            disabled={isSaving}
          >
            Reset to Default
          </Button>
        </div>
      </AccessibleModal>
    </div>
  );
}
