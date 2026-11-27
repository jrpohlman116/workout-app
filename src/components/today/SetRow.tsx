import { Check } from 'lucide-react';

export type SetRowState = 'upcoming' | 'current' | 'done' | 'missed';

interface SetRowProps {
  number: number;
  weight: number;
  reps: number;
  unit: string;
  /** "35 + 5 per side" */
  plates?: string | null;
  state: SetRowState;
  /** For a missed set: the target, shown as "2 of 3". */
  targetReps?: number;
  /** Label for the log button: "Log", "Hit 3". */
  logLabel?: string;
  onLog?: () => void;
  /** Tapping the numbers opens the edit sheet. */
  onEdit?: () => void;
  /** e.g. "Back-off set 2" for screen readers. */
  name: string;
}

const ROW: Record<SetRowState, string> = {
  upcoming: 'bg-gray-50 dark:bg-gray-900/40',
  current: 'bg-white dark:bg-gray-800 ring-2 ring-gray-900 dark:ring-gray-100',
  done: 'bg-green-50 dark:bg-green-900/20',
  missed: 'bg-amber-50 dark:bg-amber-900/20',
};

const BADGE: Record<SetRowState, string> = {
  upcoming: 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  current: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
  done: 'bg-green-800 text-white',
  missed: 'bg-amber-800 text-white',
};

/** One set: number, weight × reps, plates per side, and its action (proposal #1). */
export default function SetRow({
  number, weight, reps, unit, plates, state, targetReps, logLabel = 'Log', onLog, onEdit, name,
}: SetRowProps) {
  const numbers = (
    <span className="flex flex-col min-w-0">
      <span className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100 tabular-nums">
        {weight} {unit} × {reps}
      </span>
      {plates && <span className="text-xs leading-4 text-gray-500 dark:text-gray-400">{plates}</span>}
    </span>
  );

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${ROW[state]}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${BADGE[state]}`} aria-hidden="true">
        {number}
      </span>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${name}: ${weight} ${unit} × ${reps}. Edit`}
          className="flex-1 min-w-0 min-h-[44px] text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {numbers}
        </button>
      ) : (
        <span className="flex-1 min-w-0">{numbers}</span>
      )}
      {state === 'done' && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-800 text-white" role="img" aria-label={`${name} done`}>
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      {state === 'missed' && (
        <span className="shrink-0 px-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
          {reps} of {targetReps}
        </span>
      )}
      {(state === 'current' || state === 'upcoming') && onLog && (
        <button
          type="button"
          onClick={onLog}
          aria-label={`${logLabel}: ${name}, ${weight} ${unit} × ${reps}`}
          className={`shrink-0 min-h-[44px] min-w-[56px] rounded-xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            state === 'current'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          }`}
        >
          {logLabel}
        </button>
      )}
    </div>
  );
}
