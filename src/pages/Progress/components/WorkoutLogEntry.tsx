import { ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import type { AccessoryExercise } from '../../../lib/types';

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
  unitPreference?: string;
}

export default function WorkoutLogEntry({ session, accessories, isExpanded, onToggle, unitPreference = 'lb' }: WorkoutLogEntryProps) {
  const liftTypeNames: Record<string, string> = {
    squat: 'Squat',
    bench: 'Bench Press',
    deadlift: 'Deadlift',
    ohp: 'Overhead Press',
    upper: 'Upper Body',
  };

  const dateStr = new Date(session.completed_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="overflow-hidden">
      <Button
        variant="ghost"
        size="md"
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {liftTypeNames[session.lift_type] ?? session.lift_type}
              {session.is_1rm_test && ' · 1RM Test'}
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black tabular-nums leading-none text-gray-900 dark:text-gray-100">
                {session.weight_lifted}
              </span>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span>
              <span className="text-xl font-bold tabular-nums text-gray-700 dark:text-gray-300">
                × {session.reps_performed}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
              <span className="tabular-nums">Est. 1RM {Math.round(session.calculated_1rm)}{unitPreference}</span>
              <span aria-hidden="true">·</span>
              <span>W{session.week} C{session.cycle}</span>
              <span aria-hidden="true">·</span>
              <span>{dateStr}</span>
            </div>
          </div>
          <div className="flex-shrink-0 pt-1">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-400" />
            )}
          </div>
        </div>
      </Button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          {session.notes && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{session.notes}</p>
            </div>
          )}

          {accessories.length > 0 && (
            <div>
              <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-3">Accessories</p>
              <div className="space-y-3">
                {accessories.map(acc => (
                  <div key={acc.id} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{acc.exercise_name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {acc.sets_data.map((set, idx) => (
                          <span
                            key={idx}
                            className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg tabular-nums"
                          >
                            {set.weight ? `${set.weight}×${set.reps}` : `${set.reps}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
