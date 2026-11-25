import type { WarmupSet, WarmupFeel, WarmupProgression } from './types';
export type { RepWave, WavePhase, WeekBlock, WaveSchedule, BackoffSet, WarmupSet, WarmupFeel, WarmupProgression, JuggernautSetsConfig } from './types';
import { getRoundingIncrement } from './programs/shared/rounding';
export { getRoundingIncrement, MS_PER_WEEK } from './programs/shared/rounding';
// Program engines now live under ./programs; re-exported so existing imports keep working.
export {
  calculateNewTrainingMax,
  calculateJuggernautSets,
  applyVariationCredit,
  isWaveBoundaryAdvance,
  calculateBackoffSets,
  buildWaveSchedule,
} from './programs/juggernaut/engine';
export { calculatePeakingSets, getPeakingWeekNote } from './programs/shared/peaking';

// Conservative training max — 90% leaves room for PR attempts on meet day
export const TRAINING_MAX_FACTOR = 0.9;


export const LB_PER_KG = 2.20462;

// Converts a raw weight between lb/kg. Returns the value unrounded — callers
// round to whatever precision fits their context (plate increment for maxes,
// 0.1 for bodyweight, etc.) via getRoundingIncrement or their own convention.
export function convertWeightUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  return fromUnit === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

// Standard bar weights by unit — also the Calculator's defaults
export const BAR_WEIGHTS: Record<string, number> = { lb: 45, kg: 20 };

// Plate sets assumed when the user hasn't customized theirs in the Calculator
export const DEFAULT_PLATES_LB = [45, 25, 10, 5, 2.5];
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateBreakdown {
  /** Per-side plates, heaviest first. Empty array = empty bar. */
  plates: { weight: number; count: number }[];
  /** The total actually loadable with the available plates. */
  loadedWeight: number;
  /** False when the target isn't reachable exactly — loadedWeight is then
      the nearest loadable weight below the target. */
  exact: boolean;
}

/**
 * Greedy per-side plate breakdown, matching the Calculator's behavior:
 * heaviest available plates first, nearest-below when the target can't be
 * hit exactly. Returns null when the target is below the bar itself.
 */
export function calculatePlateBreakdown(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[]
): PlateBreakdown | null {
  if (!targetWeight || targetWeight < barWeight) return null;

  const perSide = (targetWeight - barWeight) / 2;
  const sorted = [...availablePlates].sort((a, b) => b - a);
  const plates: { weight: number; count: number }[] = [];
  let remaining = perSide;

  for (const plate of sorted) {
    const count = Math.floor((remaining + 1e-9) / plate);
    if (count > 0) {
      plates.push({ weight: plate, count });
      remaining -= count * plate;
    }
  }

  const loadedPerSide = perSide - remaining;
  return {
    plates,
    loadedWeight: Math.round((barWeight + loadedPerSide * 2) * 100) / 100,
    exact: remaining < 1e-9,
  };
}

/** Compact per-side notation: "45×3 · 25 · 2.5"; empty bar → "empty bar". */
export function formatPlateBreakdown(breakdown: PlateBreakdown): string {
  if (breakdown.plates.length === 0) return 'empty bar';
  return breakdown.plates
    .map(p => (p.count > 1 ? `${p.weight}×${p.count}` : `${p.weight}`))
    .join(' · ');
}

export function getWilksLevel(score: number): string {
  if (score < 200) return 'Beginner';
  if (score < 238) return 'Novice';
  if (score < 326) return 'Intermediate';
  if (score < 414) return 'Advanced';
  return 'Elite';
}

export function getDotsLevel(score: number): string {
  if (score < 300) return 'Beginner';
  if (score < 350) return 'Novice';
  if (score < 450) return 'Intermediate';
  if (score < 550) return 'Advanced';
  return 'Elite';
}

export function getIpfglLevel(score: number): string {
  if (score < 40) return 'Beginner';
  if (score < 55) return 'Novice';
  if (score < 70) return 'Intermediate';
  if (score < 85) return 'Advanced';
  return 'Elite';
}

export function calculateOneRepMax(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30)); // Epley formula
}

export function calculateTrainingMax(oneRepMax: number): number {
  return Math.round(oneRepMax * TRAINING_MAX_FACTOR);
}


export function calculateWilksScore(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  bodyweight: number,
  gender: string
): number {
  if (bodyweight <= 0) return 0;

  const total = squatMax + benchMax + deadliftMax;

  let a, b, c, d, e, f;

  if (gender === 'female') {
    a = 594.31747775582;
    b = -27.23842536447;
    c = 0.82112226871;
    d = -0.00930733913;
    e = 4.731582e-5;
    f = -9.054e-8;
  } else {
    a = -216.0475144;
    b = 16.2606339;
    c = -0.002388645;
    d = -0.00113732;
    e = 7.01863e-6;
    f = -1.291e-8;
  }

  const denominator = a + b * bodyweight + c * Math.pow(bodyweight, 2) +
    d * Math.pow(bodyweight, 3) + e * Math.pow(bodyweight, 4) +
    f * Math.pow(bodyweight, 5);

  const wilksCoefficient = 500 / denominator;

  return Math.round((total * wilksCoefficient) * 100) / 100;
}

export function calculateDOTSScore(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  bodyweight: number,
  gender: string
): number {
  if (bodyweight <= 0) return 0;

  const total = squatMax + benchMax + deadliftMax;

  let a, b, c, d, e;

  if (gender === 'female') {
    a = -57.96288;
    b = 13.6175032;
    c = -0.1126655495;
    d = 0.0005158568;
    e = -0.0000010706;
  } else {
    a = -307.75076;
    b = 24.0900756;
    c = -0.1918759221;
    d = 0.0007391293;
    e = -0.000001093;
  }

  const denominator = a + b * bodyweight + c * Math.pow(bodyweight, 2) +
    d * Math.pow(bodyweight, 3) + e * Math.pow(bodyweight, 4);

  const dotsCoefficient = 500 / denominator;

  return Math.round((total * dotsCoefficient) * 100) / 100;
}

export function calculateIPFGLScore(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  bodyweight: number,
  gender: string
): number {
  if (bodyweight <= 0) return 0;

  const total = squatMax + benchMax + deadliftMax;

  let a, b, c;

  if (gender === 'female') {
    a = 610.32796;
    b = 1045.59282;
    c = 0.03048;
  } else {
    a = 1199.72839;
    b = 1025.18162;
    c = 0.00921;
  }

  const denominator = (a - b * Math.exp(-c * bodyweight));

  const ipfglPoints = 100 / denominator;

  return Math.round((total * ipfglPoints) * 100) / 100;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ─── Juggernaut Method ────────────────────────────────────────────────────────


const APPROACH_PCT: Record<WarmupFeel, number> = {
  bad:  0.90,
  good: 0.90,
  easy: 0.93,
};

const WORKING_SET_PCT: Record<WarmupFeel, Record<WarmupFeel, number>> = {
  bad:  { bad: 0.96, good: 0.98, easy: 1.00 },
  good: { bad: 0.98, good: 1.00, easy: 1.02 },
  easy: { bad: 1.00, good: 1.02, easy: 1.04 },
};










// Per-lift warm-up ramps: percentage of the top set and reps at each step,
// after the empty bar. Squat gets the most graduated ramp (it responds well
// to volume at moderate loads), bench a shorter one (less neural/joint
// overhead), deadlift the shortest with the biggest relative jumps (its
// warm-up is mostly setup/positional rehearsal, not muscle priming) —
// per general powerlifting warm-up guidance rather than a fixed percentage
// or plate-jump formula applied uniformly across lifts.
const BAR_REPS: Record<'squat' | 'bench' | 'deadlift', number> = {
  squat: 8,
  bench: 10,
  deadlift: 5,
};

const WARMUP_RAMPS: Record<'squat' | 'bench' | 'deadlift', { pct: number; reps: number }[]> = {
  squat: [
    { pct: 0.40, reps: 5 },
    { pct: 0.50, reps: 5 },
    { pct: 0.60, reps: 3 },
    { pct: 0.70, reps: 3 },
    { pct: 0.80, reps: 2 },
  ],
  bench: [
    { pct: 0.40, reps: 5 },
    { pct: 0.60, reps: 3 },
    { pct: 0.75, reps: 2 },
    { pct: 0.85, reps: 1 },
  ],
  deadlift: [
    { pct: 0.30, reps: 5 },
    { pct: 0.50, reps: 3 },
    { pct: 0.70, reps: 2 },
    { pct: 0.85, reps: 1 },
  ],
};

function getWarmupRampKey(liftType: string): 'squat' | 'bench' | 'deadlift' {
  if (liftType === 'deadlift') return 'deadlift';
  if (liftType === 'bench' || liftType === 'upper' || liftType === 'ohp') return 'bench';
  return 'squat';
}

/**
 * Calculates warm-up set progression leading to a top set, using a ramp
 * shaped for the specific lift (see WARMUP_RAMPS) rather than one formula
 * applied to every lift. Percentages are of the top set itself, so the ramp
 * scales correctly whether the top set is light or heavy — sports-science
 * findings on this are limited, but the available evidence indicates
 * relative (percentage) warm-up structure holds regardless of absolute
 * strength level; what should vary is the lift, not the load.
 */
export function calculateWarmupSets(
  topSetWeight: number,
  unit: string = 'lb',
  liftType: string = 'squat'
): WarmupProgression {
  const roundTo = getRoundingIncrement(unit);
  const bar = BAR_WEIGHTS[unit] ?? BAR_WEIGHTS.lb;
  const rampKey = getWarmupRampKey(liftType);

  const fixedSets: WarmupSet[] = [
    { weight: bar, reps: BAR_REPS[rampKey], percentage: 0 },
    ...WARMUP_RAMPS[rampKey].map(({ pct, reps }) => ({
      weight: Math.round(topSetWeight * pct / roundTo) * roundTo,
      reps,
      percentage: Math.round(pct * 100),
    })),
  ];

  const getApproachWeight = (set4Feel: WarmupFeel): number =>
    Math.round(topSetWeight * APPROACH_PCT[set4Feel] / roundTo) * roundTo;

  const getAdjustedWorkingWeight = (set4Feel: WarmupFeel, set5Feel: WarmupFeel): number =>
    Math.round(topSetWeight * WORKING_SET_PCT[set4Feel][set5Feel] / roundTo) * roundTo;

  const approachWeights = {
    smooth: Math.round(topSetWeight * 0.95 / roundTo) * roundTo,
    tough:  Math.round(topSetWeight * 0.93 / roundTo) * roundTo,
  };

  return { fixedSets, getApproachWeight, getAdjustedWorkingWeight, approachWeights };
}

