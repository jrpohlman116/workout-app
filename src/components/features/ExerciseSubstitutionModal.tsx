import { useState, useEffect, useRef } from 'react';
import { Check, Search } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import { supabase } from '../../lib/supabase';
import { ExerciseSubstitution } from '../../lib/supabase';
import { Exercise } from '../../lib/types';
import Button from '../ui/Button';
import Input from '../ui/Input';

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
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentExercise) {
      loadSubstitutions();
      setSearchQuery('');
      setSelectedSubstitution('');
    }
  }, [isOpen, currentExercise]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedSubstitution('');
    setSearchQuery('');
    onClose();
  };

  const handleSelectExercise = (exercise: string) => {
    setSelectedSubstitution(exercise);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easier':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'harder':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
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

  const isSearching = searchQuery.trim().length > 0;

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Substitute Exercise"
      description={`Choose a substitute exercise for ${currentExercise}`}
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
            aria-label="Search exercises"
          />
        </div>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" aria-hidden="true"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading substitution options...</p>
            </div>
          ) : isSearching ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Search Results ({filteredAvailableExercises.length})
              </h3>
              {filteredAvailableExercises.length > 0 ? (
                <div role="list" className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAvailableExercises.map((exercise, index) => {
                  const isRecommended = recommendedExerciseNames.has(exercise.name);
                  const recommendedData = substitutions.find(s => s.substitute_exercise === exercise.name);

                  return (
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
                      aria-label={
                        isRecommended
                          ? `${exercise.name}, ${getDifficultyLabel(recommendedData!.difficulty)} difficulty. ${recommendedData!.description}`
                          : `${exercise.name}, ${exercise.sets} sets of ${exercise.reps} reps${exercise.isBodyweight ? ', bodyweight exercise' : ''}`
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</h4>
                            {isRecommended && recommendedData && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDifficultyColor(
                                  recommendedData.difficulty
                                )}`}
                              >
                                {getDifficultyLabel(recommendedData.difficulty)}
                              </span>
                            )}
                          </div>
                          {isRecommended && recommendedData ? (
                            <>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{recommendedData.description}</p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Equipment:</span> {recommendedData.equipment_needed}
                                </span>
                                {recommendedData.muscle_groups.length > 0 && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    <span className="font-medium">Targets:</span>{' '}
                                    {recommendedData.muscle_groups.join(', ')}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {exercise.sets} sets × {exercise.reps} reps
                              {exercise.isBodyweight && (
                                <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                  Bodyweight
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        {selectedSubstitution === exercise.name && (
                          <Check className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No exercises found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        ) : substitutions.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Recommended Substitutions ({substitutions.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto" role="list">
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
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No recommended substitutions available.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Use the search above to find an exercise.
            </p>
          </div>
        )}
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="md"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selectedSubstitution}
          >
            Confirm Substitution
          </Button>
        </div>
      </div>
    </AccessibleModal>
  );
}
