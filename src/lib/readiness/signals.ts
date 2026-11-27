import { liftNames } from '../exercises';
import type { ReadinessSession, Signal } from './types';

// Training signals from a session (UX handoff, phase 2):
// - Missed top set: fewer reps than the week's minimum.
// - Short back-offs: 2 or more sets below the lift's normal, where normal is
//   the median over its last 6 uncapped sessions.
// - Early drop-off: missed reps on the first back-off set.
// Sessions whose back-off cap was lowered by readiness or time say nothing
// about back-offs, so they're left out of both back-off signals and the normal.

export const NORMAL_WINDOW = 6;
/** Comparable sessions needed before a lift has a normal. */
export const NORMAL_MIN_SESSIONS = 3;
export const SHORT_BACKOFF_SETS = 2;

const name = (s: ReadinessSession) => liftNames[s.lift] ?? s.lift;
const plural = (n: number) => (n === 1 ? 'set' : 'sets');

/** Back-off sets done at target before the first miss. */
export function backoffsDone(session: ReadinessSession): number {
  const miss = session.backoffReps.findIndex(r => r < session.backoffTarget);
  return miss === -1 ? session.backoffReps.length : miss;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * A lift's normal back-off count: the median over its last 6 uncapped
 * sessions with the same cap, before `session`. Weeks with a different cap
 * (5 in weeks 1-2, 2 in weeks 3-4) aren't comparable, so they're kept apart.
 * Null until there are 3 such sessions.
 */
export function normalBackoffs(session: ReadinessSession, earlier: ReadinessSession[]): number | null {
  const comparable = earlier
    .filter(s => s.lift === session.lift && !s.capped && s.backoffCap === session.backoffCap)
    .slice(-NORMAL_WINDOW)
    .map(backoffsDone);
  return comparable.length >= NORMAL_MIN_SESSIONS ? median(comparable) : null;
}

export function missedTopSet(session: ReadinessSession): boolean {
  return session.topReps < session.topTarget;
}

export function earlyDropOff(session: ReadinessSession): boolean {
  return !session.capped && session.backoffReps.length > 0 && session.backoffReps[0] < session.backoffTarget;
}

export function shortBackoffs(session: ReadinessSession, earlier: ReadinessSession[]): boolean {
  if (session.capped) return false;
  const normal = normalBackoffs(session, earlier);
  return normal != null && normal - backoffsDone(session) >= SHORT_BACKOFF_SETS;
}

/** The signals a session raises, given the sessions before it (oldest first). */
export function sessionSignals(session: ReadinessSession, earlier: ReadinessSession[]): Signal[] {
  const signals: Signal[] = [];
  if (missedTopSet(session)) {
    signals.push({
      kind: 'missed_top_set', lift: session.lift,
      text: `${name(session)} top set: ${session.topReps} of ${session.topTarget} reps`,
    });
  }
  if (shortBackoffs(session, earlier)) {
    const done = backoffsDone(session);
    const normal = normalBackoffs(session, earlier) as number;
    signals.push({
      kind: 'short_backoffs', lift: session.lift,
      text: `${name(session)} back-offs: ${done} ${plural(done)}, your normal is ${normal}`,
    });
  }
  if (earlyDropOff(session)) {
    signals.push({
      kind: 'early_dropoff', lift: session.lift,
      text: `${name(session)} back-offs fell short on the first set`,
    });
  }
  return signals;
}
