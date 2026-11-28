import type { ReadinessState } from '../../lib/readiness/types';

const STYLES: Record<ReadinessState, { label: string; chip: string; dot: string }> = {
  green: { label: 'Green · Ready', chip: 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-700 dark:bg-green-400' },
  yellow: { label: 'Yellow · Lighter day', chip: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-600 dark:bg-amber-400' },
  red: { label: 'Red · Recovery day', chip: 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-700 dark:bg-red-400' },
};

/** Today's readiness state (proposal #3). The dot is decoration; the words carry the state. */
export default function ReadinessChip({ state, overridden = false }: { state: ReadinessState; overridden?: boolean }) {
  const style = STYLES[state];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold leading-5 ${style.chip}`}>
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      {overridden ? `${style.label.split(' · ')[0]} · Your call` : style.label}
    </span>
  );
}
