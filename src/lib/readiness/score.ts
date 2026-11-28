import { backoffsDone, normalBackoffs } from './signals';
import type { ReadinessSession, ReadinessState } from './types';

// Readiness score (UX handoff, phase 2; proposal confirmed by Jordan
// 2026-11-27). The score is for display. The state comes from the rules in
// state.ts, and the score is clamped into that state's band.
//
// Training-only: 40% top sets, 40% back-offs, 20% rest.
//   Top sets: 75 at the minimum, up to 100 for reps above it.
//   Back-offs: 75 at normal, up to 100 above it.
//   Rest days: 0 = 50, 1 = 80, 2 or more = 100.
// With a wearable: 40% HRV, 30% sleep, 15% run load, 15% training.

export const BANDS: Record<ReadinessState, [number, number]> = {
  green: [70, 100],
  yellow: [45, 69],
  red: [0, 44],
};

/** Sessions the top-set and back-off parts average over. */
export const SCORE_WINDOW = 3;
/** Points per rep above the top-set minimum; 5 extra reps reach 100. */
const POINTS_PER_EXTRA_REP = 5;
/** Points per back-off set above normal; 2 extra sets reach 100. */
const POINTS_PER_EXTRA_SET = 12.5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** Top-set part for one session: 75 at the minimum, less below it, up to 100 above. */
export function topSetPart(session: ReadinessSession): number {
  if (session.topTarget <= 0) return 75;
  if (session.topReps < session.topTarget) return clamp((75 * session.topReps) / session.topTarget, 0, 75);
  return clamp(75 + (session.topReps - session.topTarget) * POINTS_PER_EXTRA_REP, 75, 100);
}

/**
 * Back-off part for one session: 75 at the lift's normal, less below it, up
 * to 100 above. 75 when there's no normal yet or the session was capped
 * (a capped session says nothing about back-offs).
 */
export function backoffPart(session: ReadinessSession, earlier: ReadinessSession[]): number {
  if (session.capped) return 75;
  const normal = normalBackoffs(session, earlier);
  if (normal == null || normal <= 0) return 75;
  const done = backoffsDone(session);
  if (done < normal) return clamp((75 * done) / normal, 0, 75);
  return clamp(75 + (done - normal) * POINTS_PER_EXTRA_SET, 75, 100);
}

/** One session's training score: top set and back-offs weighted equally. */
export function sessionScore(session: ReadinessSession, earlier: ReadinessSession[]): number {
  return (topSetPart(session) + backoffPart(session, earlier)) / 2;
}

/** True when a session scored below the lifter's normal (75). */
export function belowNormal(session: ReadinessSession, earlier: ReadinessSession[]): boolean {
  return sessionScore(session, earlier) < 75;
}

export function restPart(daysSinceLastSession: number): number {
  if (daysSinceLastSession <= 0) return 50;
  if (daysSinceLastSession === 1) return 80;
  return 100;
}

/** Training-only score from sessions (oldest first), before clamping. */
export function trainingScore(sessions: ReadinessSession[], daysSinceLastSession: number): number {
  const recent = sessions.slice(-SCORE_WINDOW);
  if (recent.length === 0) return 0.4 * 75 + 0.4 * 75 + 0.2 * restPart(daysSinceLastSession);
  const start = sessions.length - recent.length;
  const top = mean(recent.map(topSetPart));
  const back = mean(recent.map((s, i) => backoffPart(s, sessions.slice(0, start + i))));
  return 0.4 * top + 0.4 * back + 0.2 * restPart(daysSinceLastSession);
}

export interface WearableParts {
  /** Each 0-100. */
  hrv: number;
  sleep: number;
  runLoad: number;
  training: number;
}

/** Score with a wearable connected (phase 8 supplies the parts). */
export function wearableScore(parts: WearableParts): number {
  return 0.4 * parts.hrv + 0.3 * parts.sleep + 0.15 * parts.runLoad + 0.15 * parts.training;
}

/** Rounds and clamps a raw score into the band of the state the rules chose. */
export function clampToBand(raw: number, state: ReadinessState): number {
  const [lo, hi] = BANDS[state];
  return clamp(Math.round(raw), lo, hi);
}
