import { ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../ui/Card';
import SetRow from './SetRow';
import { formatRest } from '../../hooks/useActiveSession';

export interface WarmupSet {
  weight: number;
  reps: number;
  plates: string | null;
}

interface WarmupCardProps {
  sets: WarmupSet[];
  unit: string;
  done: number;
  open: boolean;
  onToggle: () => void;
  onLog: () => void;
  onSkip: () => void;
  /** Seconds of warm-up rest left, when it's running. */
  restLeft: number | null;
}

/**
 * Optional warm-ups above the top set (proposal #1, decision 8). They never
 * change the top set, round to 5 lb on every lift, and are not saved with the
 * session's main sets.
 */
export default function WarmupCard({ sets, unit, done, open, onToggle, onLog, onSkip, restLeft }: WarmupCardProps) {
  const lightest = sets.find(s => s.weight > sets[0]?.weight)?.weight;
  const heaviest = sets[sets.length - 1]?.weight;
  const summary = lightest != null && heaviest != null
    ? `Empty bar, then ${lightest} to ${heaviest} ${unit}.`
    : 'Empty bar.';

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="warmup-sets"
          className="flex flex-1 items-center justify-between gap-2 min-h-[44px] text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <h2 className="text-h4 text-gray-900 dark:text-gray-100">Warm-ups</h2>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            {open ? `${done} of ${sets.length}` : `${sets.length} sets · optional`}
            {open ? <ChevronUp className="h-5 w-5 text-gray-500" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />}
          </span>
        </button>
        {open && (
          <button type="button" onClick={onSkip} className="min-h-[44px] px-2 text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Skip
          </button>
        )}
      </div>
      {!open && <p className="text-sm text-gray-600 dark:text-gray-300">{summary} Tap to open.</p>}
      {open && (
        <div id="warmup-sets" className="space-y-2">
          {restLeft != null && restLeft > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">Rest <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatRest(restLeft)}</span></span>
              <span className="text-xs text-gray-400">Warm-up rest is 1 min</span>
            </div>
          )}
          <ol className="space-y-2">
            {sets.map((s, i) => (
              <li key={i}>
                <SetRow
                  number={i + 1}
                  name={`Warm-up set ${i + 1}`}
                  weight={s.weight}
                  reps={s.reps}
                  unit={unit}
                  plates={i === 0 ? 'Empty bar' : s.plates}
                  state={i < done ? 'done' : i === done ? 'current' : 'upcoming'}
                  onLog={i === done ? onLog : undefined}
                />
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Warm-ups round to {unit === 'kg' ? '2.5' : '5'} to keep plate changes simple. Logging them is optional and never changes your top set.
          </p>
        </div>
      )}
    </Card>
  );
}
