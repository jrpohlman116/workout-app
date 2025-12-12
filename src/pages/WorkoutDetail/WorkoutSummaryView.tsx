import { Exercise } from './types';

interface WorkoutSummaryViewProps {
  mainWeights: { set1: number; set2: number; set3: number };
  mainReps: string | number;
  exercises: Exercise[];
  onStartWorkout: () => void;
  programVariation?: 'standard' | 'bbb' | 'bbs';
  supplementalWeight?: number;
  supplementalConfig?: { sets: number; reps: number } | null;
}

export default function WorkoutSummaryView({
  mainWeights,
  mainReps,
  exercises,
  onStartWorkout,
  programVariation = 'standard',
  supplementalWeight = 0,
  supplementalConfig = null,
}: WorkoutSummaryViewProps) {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Accessory Exercises</h2>
        <div className="space-y-2">
          {exercises.map((exercise, idx) => (
            <div key={idx} className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <span className="text-gray-900 dark:text-gray-100 font-medium">{exercise.name}</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{exercise.reps}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStartWorkout}
        className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
      >
        Start Workout
      </button>
    </div>
  );
}
