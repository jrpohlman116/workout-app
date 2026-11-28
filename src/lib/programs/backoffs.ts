import { WAVE, backoffSetsOf, firstBackoffDroppedOff } from './fiveThreeOne/engine';
import type { LiftId, ProgramState, SessionSummary } from './types';

// Back-off load progression within a wave (programming handoff, "Back-off
// loads"). Pure: the app stores the result in user_profiles.program_state.
//
// - All back-offs at target reps, up to the cap, in 2 sessions in a row: +2.5%.
// - Drop-off on the first back-off set in 2 sessions in a row: -5%.
// - Anything else: no change.
// - Sessions whose cap was lowered by readiness or time don't count toward
//   either streak. Deload sessions don't either: they're meant to be easy.
// - Offsets belong to one wave. They stop applying when the next wave starts
//   from the new training max (the state carries the wave it was built in).

export const BACKOFF_STEP_UP = 0.025;
export const BACKOFF_STEP_DOWN = -0.05;

export type BackoffChange = typeof BACKOFF_STEP_UP | typeof BACKOFF_STEP_DOWN | 0;

export interface BackoffLiftState {
  /** Offset applied to the back-off load: 0.025 = +2.5%. */
  pct: number;
  fullStreak: number;
  firstSetDropStreak: number;
  /** Wave (block.cycleIndex) this state was built in. */
  cycleIndex?: number;
}

export const EMPTY_BACKOFF_STATE: BackoffLiftState = { pct: 0, fullStreak: 0, firstSetDropStreak: 0 };

/** True when every back-off hit its target reps and the cap was reached. */
export function allBackoffsFull(session: SessionSummary): boolean {
  const week = WAVE[session.phase as keyof typeof WAVE];
  if (!week) return false;
  const sets = backoffSetsOf(session);
  return sets.length >= week.backoff.sets && sets.every(s => s.reps >= week.backoff.reps);
}

function counts(session: SessionSummary): boolean {
  return !session.backoffsCapped && session.phase !== 'deload' && session.phase in WAVE;
}

/** State after one more session, and the change that session triggered. */
export function nextBackoffState(
  prev: BackoffLiftState,
  session: SessionSummary,
): { state: BackoffLiftState; change: BackoffChange } {
  if (!counts(session)) return { state: prev, change: 0 };

  let fullStreak = allBackoffsFull(session) ? prev.fullStreak + 1 : 0;
  let firstSetDropStreak = firstBackoffDroppedOff(session) ? prev.firstSetDropStreak + 1 : 0;
  let change: BackoffChange = 0;

  if (fullStreak >= 2) {
    change = BACKOFF_STEP_UP;
    fullStreak = 0;
  } else if (firstSetDropStreak >= 2) {
    change = BACKOFF_STEP_DOWN;
    firstSetDropStreak = 0;
  }

  // Rounded so repeated steps don't pile up float noise (0.025 + 0.025 ...).
  const pct = Math.round((prev.pct + change) * 10000) / 10000;
  return { state: { ...prev, pct, fullStreak, firstSetDropStreak }, change };
}

/** Back-off state for a lift from its sessions in the current wave, oldest first. */
export function backoffStateFromHistory(history: SessionSummary[], cycleIndex?: number): BackoffLiftState {
  const state = history.reduce((s, session) => nextBackoffState(s, session).state, EMPTY_BACKOFF_STATE);
  return cycleIndex == null ? state : { ...state, cycleIndex };
}

/** The change the latest session in `history` triggered: +2.5%, -5% or none. */
export function nextBackoffAdjustment(history: SessionSummary[]): BackoffChange {
  let state = EMPTY_BACKOFF_STATE;
  let change: BackoffChange = 0;
  for (const session of history) ({ state, change } = nextBackoffState(state, session));
  return change;
}

interface BackoffProgramState {
  backoff?: Partial<Record<LiftId, BackoffLiftState>>;
}

/** Offset for a lift's back-off load in the given wave; 0 once the wave has moved on. */
export function backoffOffset(state: ProgramState | undefined, lift: LiftId, cycleIndex: number | undefined): number {
  const entry = (state as BackoffProgramState | undefined)?.backoff?.[lift];
  if (!entry || entry.cycleIndex !== cycleIndex) return 0;
  return Number.isFinite(entry.pct) ? entry.pct : 0;
}

/** program_state with one lift's back-off state replaced. Other keys are kept. */
export function withBackoffState(state: ProgramState | undefined, lift: LiftId, next: BackoffLiftState): ProgramState {
  const current = (state ?? {}) as BackoffProgramState & ProgramState;
  return { ...current, backoff: { ...(current.backoff ?? {}), [lift]: next } };
}
