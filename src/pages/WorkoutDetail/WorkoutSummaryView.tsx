import { Exercise } from './types';

interface WorkoutSummaryViewProps {
  mainWeights: { set1: number; set2: number; set3: number };
  mainReps: string | number;
  exercises: Exercise[];
  onStartWorkout: () => void;
}

export default function WorkoutSummaryView({ mainWeights, mainReps, exercises, onStartWorkout }: WorkoutSummaryViewProps) {
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
