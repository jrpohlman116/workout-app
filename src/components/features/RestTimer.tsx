import { useState, useEffect, useRef } from 'react';
import { Plus, X, Vibrate, VibrateOff } from 'lucide-react';
import { REST_TIMER_VIBRATE_KEY } from '../../lib/constants';
import IconButton from '../ui/IconButton';

interface RestTimerProps {
  /** Epoch ms when the rest ends. Remaining time is always derived from
      Date.now(), so the countdown survives screen lock and backgrounding. */
  endsAt: number;
  totalSeconds: number;
  onExtend: (seconds: number) => void;
  onDismiss: () => void;
}

const remainingSeconds = (endsAt: number) => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Compact rest countdown pinned to the bottom of the workout flow. Never
 * blocks input — logging the next set while it runs is fine. Silent by
 * default; vibration on finish is an opt-in toggle persisted per device.
 */
export default function RestTimer({ endsAt, totalSeconds, onExtend, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(() => remainingSeconds(endsAt));
  const [vibrateEnabled, setVibrateEnabled] = useState(() => {
    try { return localStorage.getItem(REST_TIMER_VIBRATE_KEY) === '1'; } catch { return false; }
  });
  const vibratedRef = useRef(false);

  useEffect(() => {
    setRemaining(remainingSeconds(endsAt));
    vibratedRef.current = false;

    const tick = () => setRemaining(remainingSeconds(endsAt));
    const interval = setInterval(tick, 500);
    // Recompute immediately when the phone wakes back up
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endsAt]);

  const done = remaining === 0;

  useEffect(() => {
    if (!done) return;
    if (vibrateEnabled && !vibratedRef.current && 'vibrate' in navigator) {
      vibratedRef.current = true;
      try { navigator.vibrate([200, 100, 200]); } catch { /* unsupported */ }
    }
    // Linger briefly so "Go" is seen, then get out of the way
    const timeout = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timeout);
  }, [done, vibrateEnabled, onDismiss]);

  const toggleVibrate = () => {
    const next = !vibrateEnabled;
    setVibrateEnabled(next);
    try { localStorage.setItem(REST_TIMER_VIBRATE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  const progressPct = done ? 0 : Math.min(100, (remaining / totalSeconds) * 100);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40" role="timer" aria-label="Rest timer">
      <div className="max-w-md mx-auto bg-gray-900 dark:bg-gray-700 text-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          {done ? (
            <p className="flex-1 font-bold" role="status">Rest over — go!</p>
          ) : (
            <>
              <p className="text-2xl font-black tabular-nums flex-shrink-0" aria-hidden="true">
                {formatTime(remaining)}
              </p>
              <p className="sr-only">{formatTime(remaining)} rest remaining</p>
              <span className="flex-1 text-xs font-semibold tracking-wide text-white/50">Rest</span>
              <button
                type="button"
                onClick={() => onExtend(30)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
                aria-label="Add 30 seconds of rest"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />30s
              </button>
              <IconButton
                label={vibrateEnabled ? 'Turn off vibration on finish' : 'Vibrate when rest ends'}
                onClick={toggleVibrate}
                className={`p-2 ${vibrateEnabled ? 'text-white' : 'text-white/40'}`}
              >
                {vibrateEnabled ? <Vibrate className="w-4 h-4" /> : <VibrateOff className="w-4 h-4" />}
              </IconButton>
            </>
          )}
          <IconButton
            label={done ? 'Dismiss timer' : 'Skip rest'}
            onClick={onDismiss}
            className="p-2 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        {!done && (
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-blue-400 transition-[width] duration-500 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
