import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, Info, Search } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import { supabase } from '../../lib/supabase';
import { ExerciseSubstitution } from '../../lib/supabase';
import { Exercise } from '../../pages/WorkoutDetail/types';

interface ExerciseSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExercise: string;
  onSubstitute: (newExercise: string) => void;
  availableExercises?: Exercise[];
}

export default function ExerciseSubstitutionModal({
  isOpen,
  onClose,
  currentExercise,
  onSubstitute,
  availableExercises = [],
}: ExerciseSubstitutionModalProps) {
  const [substitutions, setSubstitutions] = useState<ExerciseSubstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubstitution, setSelectedSubstitution] = useState<string>('');
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentExercise) {
      loadSubstitutions();
      setShowAllExercises(false);
      setSearchQuery('');
      setSelectedSubstitution('');
    }
  }, [isOpen, currentExercise]);

  useEffect(() => {
    if (showAllExercises && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showAllExercises]);

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
    if (selectedSubstitution) {
      onSubstitute(selectedSubstitution);
      setSelectedSubstitution('');
      setSearchQuery('');
      setShowAllExercises(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedSubstitution('');
    setSearchQuery('');
    setShowAllExercises(false);
    onClose();
  };

  const handleSelectExercise = (exercise: string) => {
    setSelectedSubstitution(exercise);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easier':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'harder':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
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

  const filteredAvailableExercises = availableExercises.filter(
    ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      ex.name !== currentExercise
  );

  const recommendedExerciseNames = new Set(substitutions.map(s => s.substitute_exercise));
  const otherExercises = filteredAvailableExercises.filter(
    ex => !recommendedExerciseNames.has(ex.name)
  );

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Substitute Exercise"
      description={`Choose a substitute exercise for ${currentExercise}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Info className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">
              Current exercise: <span className="font-semibold">{currentExercise}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" aria-hidden="true"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading substitution options...</p>
          </div>
        ) : (
          <>
            {substitutions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recommended Substitutions ({substitutions.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto" role="list">
                  {substitutions.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSelectExercise(sub.substitute_exercise)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                        selectedSubstitution === sub.substitute_exercise
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      role="listitem"
                      aria-label={`${sub.substitute_exercise}, ${getDifficultyLabel(sub.difficulty)} difficulty. ${sub.description}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{sub.substitute_exercise}</h4>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDifficultyColor(
                                sub.difficulty
                              )}`}
                            >
                              {getDifficultyLabel(sub.difficulty)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{sub.description}</p>
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
                          <Check className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowAllExercises(!showAllExercises)}
                className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                  showAllExercises
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                aria-expanded={showAllExercises}
                aria-controls="all-exercises-list"
              >
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {showAllExercises ? 'Hide All Exercises' : 'Search All Exercises'}
                </span>
              </button>

              {showAllExercises && (
                <div id="all-exercises-list" className="mt-4 space-y-4">
                  <div className="relative">
                    <label htmlFor="exercise-search" className="sr-only">
                      Search exercises
                    </label>
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchInputRef}
                      id="exercise-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for an exercise..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
                      role="searchbox"
                      aria-autocomplete="list"
                      aria-controls="available-exercises-list"
                    />
                  </div>

                  {otherExercises.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Available Exercises ({otherExercises.length})
                      </h3>
                      <div
                        id="available-exercises-list"
                        role="list"
                        className="space-y-2 max-h-64 overflow-y-auto"
                      >
                        {otherExercises.map((exercise, index) => (
                          <button
                            key={`${exercise.name}-${index}`}
                            type="button"
                            onClick={() => handleSelectExercise(exercise.name)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                              selectedSubstitution === exercise.name
                                ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            role="listitem"
                            aria-label={`${exercise.name}, ${exercise.sets} sets of ${exercise.reps} reps${exercise.isBodyweight ? ', bodyweight exercise' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                  {exercise.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {exercise.sets} sets × {exercise.reps} reps
                                  {exercise.isBodyweight && (
                                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                      Bodyweight
                                    </span>
                                  )}
                                </p>
                              </div>
                              {selectedSubstitution === exercise.name && (
                                <Check className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : searchQuery ? (
                    <div className="py-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        No exercises found matching "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Start typing to search for exercises
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedSubstitution}
                className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                Confirm Substitution
              </button>
            </div>
          </>
        )}
      </div>
    </AccessibleModal>
  );
}
