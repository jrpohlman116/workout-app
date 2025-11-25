import { useState, useEffect } from 'react';
import { RefreshCw, Check, Info, Plus } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import { supabase } from '../../lib/supabase';
import { ExerciseSubstitution } from '../../lib/supabase';

interface ExerciseSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExercise: string;
  onSubstitute: (newExercise: string) => void;
}

export default function ExerciseSubstitutionModal({
  isOpen,
  onClose,
  currentExercise,
  onSubstitute,
}: ExerciseSubstitutionModalProps) {
  const [substitutions, setSubstitutions] = useState<ExerciseSubstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubstitution, setSelectedSubstitution] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');

  useEffect(() => {
    if (isOpen && currentExercise) {
      loadSubstitutions();
      setShowCustomInput(false);
      setCustomExerciseName('');
    }
  }, [isOpen, currentExercise]);

  const loadSubstitutions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercise_substitutions')
        .select('*')
        .eq('original_exercise', currentExercise)
        .order('difficulty', { ascending: true });

      if (error) throw error;
      setSubstitutions(data || []);
    } catch (error) {
      console.error('Error loading substitutions:', error);
      setSubstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const exerciseToUse = showCustomInput ? customExerciseName.trim() : selectedSubstitution;
    if (exerciseToUse) {
      onSubstitute(exerciseToUse);
      setSelectedSubstitution('');
      setCustomExerciseName('');
      setShowCustomInput(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedSubstitution('');
    setCustomExerciseName('');
    setShowCustomInput(false);
    onClose();
  };

  const handleSelectPredefined = (exercise: string) => {
    setSelectedSubstitution(exercise);
    setShowCustomInput(false);
    setCustomExerciseName('');
  };

  const handleShowCustomInput = () => {
    setShowCustomInput(true);
    setSelectedSubstitution('');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easier':
        return 'text-green-600 bg-green-50';
      case 'harder':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easier':
        return 'Easier';
      case 'harder':
        return 'Harder';
      default:
        return 'Similar';
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Substitute Exercise"
      description={`Choose a substitute exercise for ${currentExercise}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-700">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Current exercise: <span className="font-semibold">{currentExercise}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading substitution options...</p>
          </div>
        ) : substitutions.length === 0 ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No substitutions available for this exercise.</p>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Available Substitutions ({substitutions.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {substitutions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectPredefined(sub.substitute_exercise)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedSubstitution === sub.substitute_exercise
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{sub.substitute_exercise}</h4>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDifficultyColor(
                              sub.difficulty
                            )}`}
                          >
                            {getDifficultyLabel(sub.difficulty)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{sub.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Equipment:</span> {sub.equipment_needed}
                          </span>
                          {sub.muscle_groups.length > 0 && (
                            <span className="text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Targets:</span>{' '}
                              {sub.muscle_groups.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedSubstitution === sub.substitute_exercise && (
                        <Check className="w-6 h-6 text-blue-600 flex-shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleShowCustomInput}
                className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all mb-4 ${
                  showCustomInput
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Add Custom Exercise</span>
              </button>

              {showCustomInput && (
                <div className="mb-4">
                  <label htmlFor="custom-exercise" className="block text-sm font-semibold text-gray-700 mb-2">
                    Custom Exercise Name
                  </label>
                  <input
                    id="custom-exercise"
                    type="text"
                    value={customExerciseName}
                    onChange={(e) => setCustomExerciseName(e.target.value)}
                    placeholder="Enter exercise name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedSubstitution && (!showCustomInput || !customExerciseName.trim())}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Substitution
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AccessibleModal>
  );
}
