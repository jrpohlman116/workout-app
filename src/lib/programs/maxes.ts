import { calculateOneRepMax, TRAINING_MAX_FACTOR } from '../calculations';
import { roundLoad } from './shared/rounding';
import type { LiftId } from './types';

interface MaxFields {
  squat_max?: number | null;
  bench_max?: number | null;
  deadlift_max?: number | null;
  ohp_max?: number | null;
  ohp_tested_max?: number | null;
}

/**
 * The training max for a lift, or 0 when none is set.
 *
 * Overhead press is optional and, in the live database, ohp_max was filled
 * with a placeholder (135) for nearly every profile long before any screen
 * let anyone enter one. A real OHP max is always saved together with its
 * tested max (the calculator and the Maxes tab both write the pair), so the
 * tested max is what tells a real value from a placeholder.
 */
export function trainingMaxFor(profile: MaxFields, lift: LiftId | null): number {
  switch (lift) {
    case 'squat': return profile.squat_max ?? 0;
    case 'bench': return profile.bench_max ?? 0;
    case 'deadlift': return profile.deadlift_max ?? 0;
    case 'ohp':
      return (profile.ohp_max ?? 0) > 0 && (profile.ohp_tested_max ?? 0) > 0 ? (profile.ohp_max as number) : 0;
    default: return 0;
  }
}

export function hasTrainingMax(profile: MaxFields, lift: LiftId | null): boolean {
  return trainingMaxFor(profile, lift) > 0;
}

/**
 * Training max from a 1RM: 90%, rounded to the lift's plate step (bench and
 * overhead press to the half step). 265 -> 240, 165 -> 147.5, 285 -> 255 lb.
 */
export function trainingMaxFromOneRepMax(oneRepMax: number, lift: LiftId, unit: string): number {
  return roundLoad(oneRepMax * TRAINING_MAX_FACTOR, lift, unit);
}

export interface MaxEstimate {
  /** Estimated 1RM (Epley), stored as the tested max. */
  estimated1RM: number;
  /** Training max: 90% of the estimate, rounded to the lift's plate step. */
  trainingMax: number;
}

/**
 * Estimates a max from a recent hard set (for a lift with no max yet).
 * Returns null for input that can't produce a sensible number.
 */
export function estimateMaxFromPerformance(weight: number, reps: number, unit: string, lift: LiftId = 'squat'): MaxEstimate | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps < 1) return null;
  // Epley drifts well past ~12 reps; a set that long says little about a max.
  if (reps > 12) return null;
  const estimated1RM = calculateOneRepMax(weight, reps);
  const trainingMax = trainingMaxFromOneRepMax(estimated1RM, lift, unit);
  if (trainingMax <= 0) return null;
  return { estimated1RM, trainingMax };
}
