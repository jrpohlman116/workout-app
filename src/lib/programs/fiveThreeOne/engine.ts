import type { WavePhase } from '../../types';
import type { LiftId, SessionSummary, Unit } from '../types';

// 5/3/1 engine, built from the Ironform programming-logic handoff (2026-11-25).
// Loads are percentages of the training max (TM = 90% of the 1RM). One wave is
// four weeks: accumulation, intensification, realization, deload.

export const CYCLE_LENGTH = 4;
export const AMRAP_MINIMUM = 3;
const TM_CAP = 1.05;
const DROP_PCT = 0.05;
const E1RM_TO_TM = 0.9;

export interface WaveWeek {
  phase: WavePhase;
  top: { reps: number; pct: number; isAmrap: boolean };
  backoff: { reps: number; pct: number; sets: number };
}

// Back-off set counts here are fixed. The handoff ends back-offs by rep
// drop-off (keep going until a set misses, cap of 5); that rule ships later,
// and until then each wave uses the count below: the realization and deload
// weeks match the handoff's "1-2 x 3" and "2 x 3" ceilings.
export const WAVE: Record<'accumulation' | 'intensification' | 'realization' | 'deload', WaveWeek> = {
  accumulation:    { phase: 'accumulation',    top: { reps: 5, pct: 0.75, isAmrap: false }, backoff: { reps: 5, pct: 0.675, sets: 3 } },
  intensification: { phase: 'intensification', top: { reps: 3, pct: 0.85, isAmrap: false }, backoff: { reps: 3, pct: 0.775, sets: 3 } },
  realization:     { phase: 'realization',     top: { reps: AMRAP_MINIMUM, pct: 0.90, isAmrap: true }, backoff: { reps: 3, pct: 0.75, sets: 2 } },
  deload:          { phase: 'deload',          top: { reps: 3, pct: 0.65, isAmrap: false }, backoff: { reps: 3, pct: 0.60, sets: 2 } },
};

export const WAVE_ORDER = ['accumulation', 'intensification', 'realization', 'deload'] as const;

/**
 * Plate step a lift's loads and training max are rounded to. Squat and
 * deadlift use the full step, bench and overhead press half of it (the handoff:
 * 5 lb and 2.5 lb). Kilograms use the same split: 2.5 kg and 1.25 kg.
 */
export function loadIncrement(lift: LiftId, unit: Unit): number {
  const full = unit === 'kg' ? 2.5 : 5;
  return lift === 'bench' || lift === 'ohp' ? full / 2 : full;
}

export function roundLoad(value: number, lift: LiftId, unit: Unit): number {
  const step = loadIncrement(lift, unit);
  return Math.round(value / step) * step;
}

function floorLoad(value: number, lift: LiftId, unit: Unit): number {
  const step = loadIncrement(lift, unit);
  // Guard against 267.75 / 5 style float noise right at a boundary.
  return Math.floor(value / step + 1e-9) * step;
}

/** Fixed TM increment when the AMRAP minimum is met: +10 lb squat/deadlift, +5 lb bench/OHP (kg: 5 / 2.5). */
export function fixedIncrement(lift: LiftId, unit: Unit): number {
  const pounds = lift === 'bench' || lift === 'ohp' ? 5 : 10;
  return unit === 'kg' ? pounds / 2 : pounds;
}

/** Epley: weight x (1 + reps / 30). Unrounded. */
export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/**
 * True when a back-off dropped off on its very first set. The first back-off
 * is the set after the top set; it targets that week's back-off reps.
 */
function firstBackoffDroppedOff(session: SessionSummary): boolean {
  // Deload back-offs are meant to be easy; a short set there says nothing about strength.
  if (session.phase === 'deload') return false;
  const week = WAVE[session.phase as keyof typeof WAVE];
  if (!week) return false;
  const first = session.mainSets[1];
  return !!first && first.reps < week.backoff.reps;
}

/** Second signal: back-offs for the lift dropped off on set one in at least 2 sessions this wave. */
export function hasSecondSignal(history: SessionSummary[] = []): boolean {
  return history.filter(firstBackoffDroppedOff).length >= 2;
}

export interface NextTm {
  newTm: number;
  reason: 'increase' | 'hold' | 'decrease';
  explanation: string;
}

/**
 * Training max after the realization AMRAP, once per wave.
 *
 * Minimum met: TM plus the larger of the fixed increment or the e1RM-based
 * change (90% of the AMRAP's Epley e1RM, minus the old TM), capped at +5% and
 * rounded down to the plate step when the cap applies. A low-rep AMRAP that
 * meets the minimum never lowers the TM.
 * Minimum missed: hold, unless the second signal is present, then drop 5%.
 */
export function nextTrainingMax(args: {
  lift: LiftId;
  currentTm: number;
  topSet: { weight: number; reps: number };
  history?: SessionSummary[];
  unit: Unit;
}): NextTm {
  const { lift, currentTm, topSet, history, unit } = args;

  if (topSet.reps >= AMRAP_MINIMUM) {
    const e1rmTm = E1RM_TO_TM * epley(topSet.weight, topSet.reps);
    const raw = Math.max(currentTm + fixedIncrement(lift, unit), e1rmTm);
    const cap = currentTm * TM_CAP;
    const capped = raw > cap;
    // Rounding to the nearest step can land just above the cap; never exceed it.
    const newTm = capped ? floorLoad(cap, lift, unit) : Math.min(roundLoad(raw, lift, unit), floorLoad(cap, lift, unit));
    const result = Math.max(newTm, currentTm);
    return {
      newTm: result,
      reason: result > currentTm ? 'increase' : 'hold',
      explanation: capped
        ? `${topSet.reps} reps at ${topSet.weight} is strong, so the training max rises, held to +5% for this wave.`
        : `You hit the ${AMRAP_MINIMUM}-rep minimum, so the training max rises.`,
    };
  }

  if (hasSecondSignal(history)) {
    return {
      newTm: roundLoad(currentTm * (1 - DROP_PCT), lift, unit),
      reason: 'decrease',
      explanation: `Missed the ${AMRAP_MINIMUM}-rep minimum and your back-offs fell off on the first set in two sessions, so the training max drops 5%.`,
    };
  }

  return {
    newTm: currentTm,
    reason: 'hold',
    explanation: `Missed the ${AMRAP_MINIMUM}-rep minimum, so the training max holds and you repeat the wave.`,
  };
}
