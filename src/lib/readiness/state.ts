import { clampToBand, belowNormal, trainingScore } from './score';
import { missedTopSet, sessionSignals } from './signals';
import type { CheckIn, Readiness, ReadinessSession, ReadinessState } from './types';

// Training-only readiness (UX handoff, phase 2). Pure: same input, same output.
//
// States:
//   Green: no signals.
//   Yellow: one signal, or a session score below normal in 2 of the last 3.
//   Red: a missed top set 2 sessions in a row, or 2 or more signals.
// Signals come from the last session.
//
// Guards:
//   - The first 3 sessions are Green, "Learning your normal."
//   - After 7 or more days off: Green with a note, and the first session back
//     doesn't count toward later readings.
//   - The optional check-in can only lower the state, one step ("Rough").

export const LEARNING_SESSIONS = 3;
export const BREAK_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Sessions that count: oldest first, without the first session back after each break. */
export function countedSessions(sessions: ReadinessSession[]): ReadinessSession[] {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.filter((s, i) => i === 0 || daysBetween(sorted[i - 1].date, s.date) < BREAK_DAYS);
}

const LOWER: Record<ReadinessState, ReadinessState> = { green: 'yellow', yellow: 'red', red: 'red' };

/** A check-in can only lower the state, by one step. "Good" and "Okay" leave it alone. */
export function applyCheckIn(state: ReadinessState, checkIn?: CheckIn | null): ReadinessState {
  return checkIn === 'rough' ? LOWER[state] : state;
}

export function computeReadiness(args: {
  sessions: ReadinessSession[];
  /** Local date being scored, YYYY-MM-DD. */
  today: string;
  checkIn?: CheckIn | null;
}): Readiness {
  const all = [...args.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const last = all[all.length - 1];
  const daysOff = last ? daysBetween(last.date, args.today) : Infinity;
  const sessions = countedSessions(all);

  const finish = (base: Omit<Readiness, 'score' | 'source' | 'stateBeforeCheckIn'>): Readiness => {
    const state = applyCheckIn(base.state, args.checkIn);
    const raw = trainingScore(sessions, Number.isFinite(daysOff) ? daysOff : 2);
    return {
      ...base,
      state,
      score: clampToBand(raw, state),
      source: 'training',
      ...(state !== base.state ? { stateBeforeCheckIn: base.state } : {}),
    };
  };

  if (sessions.length < LEARNING_SESSIONS) {
    const left = LEARNING_SESSIONS - sessions.length;
    return finish({
      state: 'green', signals: [], learning: true,
      reason: 'Train as written while Ironform learns your normal.',
      note: `Learning your normal: ${left} more ${left === 1 ? 'session' : 'sessions'} to go.`,
    });
  }

  if (daysOff >= BREAK_DAYS) {
    return finish({
      state: 'green', signals: [], learning: false,
      reason: `${daysOff} days since your last session.`,
      note: "Welcome back. Today's session won't count toward your readiness.",
    });
  }

  const latest = sessions[sessions.length - 1];
  const before = sessions.slice(0, -1);
  const signals = sessionSignals(latest, before);

  const recent = sessions.slice(-3);
  const start = sessions.length - recent.length;
  const belowCount = recent.filter((s, i) => belowNormal(s, sessions.slice(0, start + i))).length;
  const previous = before[before.length - 1];
  const missedTwice = !!previous && missedTopSet(latest) && missedTopSet(previous);

  let state: ReadinessState = 'green';
  if (missedTwice || signals.length >= 2) state = 'red';
  else if (signals.length === 1 || belowCount >= 2) state = 'yellow';

  let reason: string;
  if (missedTwice) reason = 'Missed the top set in your last 2 sessions.';
  else if (signals.length > 0) reason = `${signals.map(s => s.text).join('. ')}.`;
  else if (belowCount >= 2) reason = `${belowCount} of your last 3 sessions came in below your normal.`;
  else reason = `Your last ${recent.length} sessions were on target.`;

  return finish({ state, signals, learning: false, reason });
}
