import { useEffect, useRef, useState } from 'react';
import Card from '../ui/Card';
import { formatRest } from '../../hooks/useActiveSession';

interface RestCardProps {
  endsAt: number;
  totalSeconds: number;
  onExtend: () => void;
  onSkip: () => void;
}

// A short tone and a buzz when rest ends, where the browser allows it.
function signalRestOver() {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch { /* audio blocked */ }
}

/** Inline rest between sets (proposal #2). Rest never takes over the screen. */
export default function RestCard({ endsAt, totalSeconds, onExtend, onSkip }: RestCardProps) {
  const [now, setNow] = useState(Date.now());
  const signalled = useRef(false);

  useEffect(() => {
    signalled.current = false;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    if (left === 0 && !signalled.current) {
      signalled.current = true;
      signalRestOver();
    }
  }, [left]);

  const progress = totalSeconds > 0 ? Math.min(1, 1 - left / totalSeconds) : 1;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{left > 0 ? 'Rest' : 'Rest over'}</p>
          <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100" role="timer" aria-live="off">
            {formatRest(left)}
          </p>
          {/* Announced once, when rest ends. */}
          <span className="sr-only" aria-live="polite">{left === 0 ? 'Rest over. Next set.' : ''}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onExtend} className="min-h-[44px] rounded-full bg-gray-50 dark:bg-gray-700 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Add 30 seconds of rest">
            +30s
          </button>
          <button type="button" onClick={onSkip} className="min-h-[44px] rounded-full bg-gray-50 dark:bg-gray-700 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {left > 0 ? 'Skip' : 'Done'}
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden="true">
        <div className="h-full rounded-full bg-gray-900 dark:bg-gray-100 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
    </Card>
  );
}
