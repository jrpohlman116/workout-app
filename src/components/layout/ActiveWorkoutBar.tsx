import { ChevronUp } from 'lucide-react';
import { formatRest, type ActiveSession } from '../../hooks/useActiveSession';

interface ActiveWorkoutBarProps {
  session: ActiveSession;
  onOpen: () => void;
}

/**
 * Shown above the tab bar on every tab except Today while a session is in
 * progress (proposal #12). Tapping it returns to Today.
 */
export default function ActiveWorkoutBar({ session, onOpen }: ActiveWorkoutBarProps) {
  const label = [
    'Return to your workout',
    session.title,
    session.next,
    session.restSeconds != null ? `${formatRest(session.restSeconds)} rest left` : undefined,
  ].filter(Boolean).join('. ');

  return (
    <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 pointer-events-none">
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="pointer-events-auto w-full max-w-md mx-auto flex items-center gap-3 min-h-[44px] pl-4 pr-3 py-2.5 rounded-2xl bg-gray-900 text-white text-left shadow-[0_4px_8px_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700"
      >
        <span className="flex-1 min-w-0 flex flex-col gap-0.5" aria-hidden="true">
          <span className="text-sm leading-5 font-semibold truncate">{session.title}</span>
          {session.next && <span className="text-xs leading-4 opacity-70 truncate">{session.next}</span>}
        </span>
        {session.restSeconds != null && (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-sm leading-5 font-semibold tabular-nums text-gray-900" aria-hidden="true">
            {formatRest(session.restSeconds)}
          </span>
        )}
        <ChevronUp className="w-5 h-5 shrink-0" aria-hidden="true" />
      </button>
    </div>
  );
}
