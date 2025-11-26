import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccessoryExercise {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets_data: { reps: string; weight: string }[];
}

interface WorkoutLogEntryProps {
  session: {
    id: string;
    lift_type: string;
    cycle: number;
    week: number;
    weight_lifted: number;
    reps_performed: number;
    calculated_1rm: number;
    completed_at: string;
    is_1rm_test?: boolean;
    notes?: string;
  };
  accessories: AccessoryExercise[];
  isExpanded: boolean;
  onToggle: () => void;
}

export default function WorkoutLogEntry({ session, accessories, isExpanded, onToggle }: WorkoutLogEntryProps) {
  const liftTypeNames: Record<string, string> = {
    squat: 'Squat',
    bench: 'Bench Press',
    deadlift: 'Deadlift',
    ohp: 'Overhead Press',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {liftTypeNames[session.lift_type]}
            {session.is_1rm_test && (
              <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded">
                1RM Test
              </span>
            )}
          </h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span>Week {session.week}, Cycle {session.cycle}</span>
          <span>•</span>
          <span>{session.weight_lifted}lb × {session.reps_performed} reps</span>
          <span>•</span>
          <span>Est. 1RM: {Math.round(session.calculated_1rm)}lb</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {new Date(session.completed_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-4">
          {session.notes && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{session.notes}</p>
            </div>
          )}

          {accessories.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Accessory Exercises</h4>
              <div className="space-y-3">
                {accessories.map(acc => (
                  <div key={acc.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{acc.exercise_name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {acc.sets_data.map((set, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Set {idx + 1}:</span>{' '}
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {set.weight ? `${set.weight}lb × ${set.reps}` : `${set.reps} reps`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
