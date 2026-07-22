import type { RepWave, WavePhase, WeekBlock, WaveSchedule, BackoffSet, WarmupSet, WarmupFeel, WarmupProgression, JuggernautSetsConfig } from './types';
export type { RepWave, WavePhase, WeekBlock, WaveSchedule, BackoffSet, WarmupSet, WarmupFeel, WarmupProgression, JuggernautSetsConfig } from './types';

// Conservative training max — 90% leaves room for PR attempts on meet day
export const TRAINING_MAX_FACTOR = 0.9;

// Used wherever date math needs a week in milliseconds
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Bar loading increments differ by unit: 5 lb plates vs 2.5 kg plates
export function getRoundingIncrement(unit: string): number {
  return unit === 'kg' ? 2.5 : 5;
}

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
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
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


const STANDARD_PHASES: WavePhase[] = ['accumulation', 'intensification', 'realization', 'deload'];
const COMPRESSED_PHASES: WavePhase[] = ['accumulation', 'realization', 'deload'];

/**
 * Calculates the new training max after a Realization week AMAP set.
 * Each rep above (or below) the wave's standard AMAP target shifts the
 * training max by one plate increment (5 lb / 2.5 kg per rep over/under) —
 * half that for bench, which responds to rep swings with smaller jumps than
 * squat/deadlift — then rounds up to the nearest full plate increment.
 */
export function calculateNewTrainingMax(
  currentTrainingMax: number,
  standardReps: number,
  actualReps: number,
  unit: string = 'lb',
  liftType?: string
): number {
  const roundTo = getRoundingIncrement(unit);
  const perRep = liftType === 'bench' ? roundTo / 2 : roundTo;
  const raw = currentTrainingMax + (actualReps - standardReps) * perRep;
  return Math.ceil(raw / roundTo) * roundTo;
}


const JUGGERNAUT_WAVE_PERCENTS: Record<RepWave, {
  accumulation: { sets: number; pct: number };
  intensification: { sets: number; pct: number };
  realization: { pct: number };
  deload: { sets: number; pct: number };
}> = {
  10: { accumulation: { sets: 5, pct: 0.60 }, intensification: { sets: 4, pct: 0.65 }, realization: { pct: 0.75 }, deload: { sets: 3, pct: 0.45 } },
  8:  { accumulation: { sets: 5, pct: 0.65 }, intensification: { sets: 4, pct: 0.70 }, realization: { pct: 0.80 }, deload: { sets: 3, pct: 0.50 } },
  5:  { accumulation: { sets: 6, pct: 0.70 }, intensification: { sets: 5, pct: 0.75 }, realization: { pct: 0.85 }, deload: { sets: 3, pct: 0.50 } },
  3:  { accumulation: { sets: 6, pct: 0.75 }, intensification: { sets: 5, pct: 0.80 }, realization: { pct: 0.90 }, deload: { sets: 3, pct: 0.55 } },
};

export function calculateJuggernautSets(
  wave: RepWave,
  phase: WavePhase,
  trainingMax: number,
  unit: string = 'lb'
): JuggernautSetsConfig {
  const roundTo = getRoundingIncrement(unit);
  const waveCfg = JUGGERNAUT_WAVE_PERCENTS[wave];

  if (phase === 'realization') {
    return {
      numSets: 1,
      reps: wave,
      weight: Math.round(trainingMax * waveCfg.realization.pct / roundTo) * roundTo,
      isAmap: true,
    };
  }

  if (phase === 'deload') {
    return {
      numSets: waveCfg.deload.sets,
      reps: 10,
      weight: Math.round(trainingMax * waveCfg.deload.pct / roundTo) * roundTo,
      isAmap: false,
    };
  }

  const phaseCfg = phase === 'intensification' ? waveCfg.intensification : waveCfg.accumulation;
  return {
    numSets: phaseCfg.sets,
    reps: wave,
    weight: Math.round(trainingMax * phaseCfg.pct / roundTo) * roundTo,
    isAmap: false,
  };
}

// Peaking, counting back from the meet. Percentages are of training max
// (TM = 90% 1RM, so 1.00 here ≈ 90% of true 1RM). Intensity stays ≥85% 1RM
// through 3 weeks out with the peak single (~92% 1RM) landing 2 weeks out,
// per taper research (Travis et al. 2020): cut volume 30-70%, hold intensity.
// Down sets keep enough volume to avoid detraining during long peaks; the
// final 2 weeks strip to singles only. Squat/deadlift take their last heavy
// single earlier than bench (slower-recovering lifts taper first), so the
// final week diverges by lift.
const PEAKING_WEEKS: Record<number, {
  top: { squatDead: number; bench: number };
  downSets?: { sets: number; reps: number; pct: number };
}> = {
  6: { top: { squatDead: 0.85, bench: 0.85 }, downSets: { sets: 3, reps: 3, pct: 0.80 } },
  5: { top: { squatDead: 0.89, bench: 0.89 }, downSets: { sets: 3, reps: 3, pct: 0.82 } },
  4: { top: { squatDead: 0.93, bench: 0.93 }, downSets: { sets: 2, reps: 3, pct: 0.84 } },
  3: { top: { squatDead: 0.97, bench: 0.97 }, downSets: { sets: 2, reps: 2, pct: 0.85 } },
  2: { top: { squatDead: 1.02, bench: 1.00 } },
  1: { top: { squatDead: 0.85, bench: 0.97 } },
};

/**
 * Returns the top-single config for a peaking week, plus down sets in the
 * earlier weeks (6-3 out). Weeks 2-1 out are singles only: squat/deadlift
 * peak at 2 weeks out then drop to an opener-weight technical single, while
 * bench holds its last heavy single 1 week out.
 */
export function calculatePeakingSets(
  peakWeek: number,
  totalPeakWeeks: number,
  trainingMax: number,
  unit: string = 'lb',
  liftType: string = 'squat'
): JuggernautSetsConfig {
  const roundTo = getRoundingIncrement(unit);
  const weeksFromMeet = Math.max(1, Math.min(6, totalPeakWeeks - peakWeek + 1));
  const week = PEAKING_WEEKS[weeksFromMeet];
  const topPct = liftType === 'bench' || liftType === 'upper' ? week.top.bench : week.top.squatDead;

  const config: JuggernautSetsConfig = {
    numSets: 1,
    reps: 1,
    weight: Math.round(trainingMax * topPct / roundTo) * roundTo,
    isAmap: false,
  };

  if (week.downSets) {
    config.downSets = {
      weight: Math.round(trainingMax * week.downSets.pct / roundTo) * roundTo,
      sets: week.downSets.sets,
      reps: week.downSets.reps,
    };
  }

  return config;
}

/**
 * Plain-English explanation of where a peaking week sits in the taper,
 * honoring the transparency principle: the program never changes what a
 * week looks like without saying why.
 */
export function getPeakingWeekNote(
  peakWeek: number,
  totalPeakWeeks: number,
  liftType: string
): string {
  const weeksFromMeet = Math.max(1, Math.min(6, totalPeakWeeks - peakWeek + 1));
  const isBench = liftType === 'bench' || liftType === 'upper';
  if (weeksFromMeet >= 3) {
    return `${weeksFromMeet} weeks out — heavy single plus down sets to hold your strength while fatigue drops.`;
  }
  if (weeksFromMeet === 2) {
    return isBench
      ? '2 weeks out — heavy single, no down sets. Volume is gone; only intensity remains.'
      : '2 weeks out — your last heavy single. After today, this lift stays light into the meet.';
  }
  return isBench
    ? '1 week out — your last heavy single. Bench recovers fast, so it peaks closest to the meet.'
    : '1 week out — opener-weight technical single. Save everything else for the platform.';
}

/**
 * Returns back-off weight, sets, and reps based on RPE of the top set.
 * RPE ≤7: 10% drop, 3×5
 * RPE  8: 15% drop, 3×3
 * RPE  9: 20% drop, 2×3
 * RPE 10: 25% drop, 2×3
 */
export function calculateBackoffSets(
  topSetWeight: number,
  rpe: number,
  unit: string = 'lb'
): BackoffSet {
  const roundTo = getRoundingIncrement(unit);

  let dropPct: number;
  let sets: number;
  let reps: number;

  if (rpe <= 7) {
    dropPct = 0.10; sets = 3; reps = 5;
  } else if (rpe === 8) {
    dropPct = 0.15; sets = 3; reps = 3;
  } else if (rpe === 9) {
    dropPct = 0.20; sets = 2; reps = 3;
  } else {
    dropPct = 0.25; sets = 2; reps = 3;
  }

  const weight = Math.round(topSetWeight * (1 - dropPct) / roundTo) * roundTo;
  return { weight, sets, reps };
}

/**
 * Calculates warm-up set progression leading to a top set.
 * Fixed progression: bar (10), 50% (5), 67% (3), 82% (2)
 * Then calculates approach weights based on feel of 82% set.
 */
export function calculateWarmupSets(
  topSetWeight: number,
  unit: string = 'lb'
): WarmupProgression {
  const roundTo = getRoundingIncrement(unit);
  const bar = unit === 'kg' ? 20 : 45;

  const fixedSets: WarmupSet[] = [
    { weight: bar, reps: 10, percentage: 0 },
    { weight: Math.round(topSetWeight * 0.5 / roundTo) * roundTo, reps: 5, percentage: 50 },
    { weight: Math.round(topSetWeight * 0.67 / roundTo) * roundTo, reps: 3, percentage: 67 },
    { weight: Math.round(topSetWeight * 0.82 / roundTo) * roundTo, reps: 2, percentage: 82 },
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

/**
 * Builds a wave schedule working backwards from a meet/test date.
 *
 * Rules:
 * - Always includes the 3-rep wave (competition peak)
 * - Waves can be compressed to 3 weeks (intensification dropped) or elongated to 5 weeks
 * - Waves are skipped starting from the earliest (10s first) when time is short
 * - Deloads are never removed
 * - All adjustments are recorded in plain English for display to the user
 */
export function buildWaveSchedule(startDate: Date, meetDate: Date): WaveSchedule {
  const totalAvailableWeeks = Math.floor(
    (meetDate.getTime() - startDate.getTime()) / MS_PER_WEEK
  );

  // Wave selection uses the same available-weeks budget as before.
  // Peak weeks are no longer fixed — surplus training time extends the peak block (2–6 weeks).
  const STANDARD_PEAK_WEEKS = 3;
  const MAX_PEAK_WEEKS = 6;
  const MEET_WEEK = 1;
  const availableWeeks = totalAvailableWeeks - STANDARD_PEAK_WEEKS - MEET_WEEK;

  const adjustments: string[] = [];
  const skippedWaves: RepWave[] = [];

  if (availableWeeks < 3) {
    return { weeks: [], skippedWaves: [10, 8, 5, 3], adjustments: ['Not enough time to run any training waves before your peaking block. Consider starting earlier.'], totalWeeks: 0, peakWeekIndex: -1 };
  }

  // Select waves — minimum 3 weeks per wave
  let selectedWaves: RepWave[];

  if (availableWeeks >= 12) {
    selectedWaves = [10, 8, 5, 3];
  } else if (availableWeeks >= 9) {
    selectedWaves = [8, 5, 3];
    skippedWaves.push(10);
    adjustments.push(
      `Your timeline is ${availableWeeks} weeks of training. The 10-rep wave was skipped so there's enough time for full 8-rep, 5-rep, and 3-rep waves before your peaking block.`
    );
  } else if (availableWeeks >= 6) {
    selectedWaves = [5, 3];
    skippedWaves.push(10, 8);
    adjustments.push(
      `Your timeline is ${availableWeeks} weeks of training. The 10-rep and 8-rep waves were skipped so you can run a full 5-rep and 3-rep wave before your peaking block.`
    );
  } else {
    selectedWaves = [3];
    skippedWaves.push(10, 8, 5);
    adjustments.push(
      `Your timeline is ${availableWeeks} weeks of training. Only the 3-rep wave fits before your peaking block.`
    );
  }

  // Compress waves when time is tight; surplus goes to peaking (not wave extension).
  const waveLengths = new Map<RepWave, number>(selectedWaves.map(w => [w, 4]));
  const standardTotal = selectedWaves.length * 4;
  const diff = availableWeeks - standardTotal;

  if (diff < 0) {
    let shortage = Math.abs(diff);
    for (const wave of selectedWaves) {
      if (shortage <= 0) break;
      if (waveLengths.get(wave)! > 3) {
        waveLengths.set(wave, 3);
        shortage--;
        adjustments.push(
          `The ${wave}-rep wave was compressed to 3 weeks (the intensification phase was removed) to fit your timeline.`
        );
      }
    }
  }

  // Surplus weeks (diff > 0) extend the peak block instead of the training waves.
  const peakingWeeks = Math.min(MAX_PEAK_WEEKS, STANDARD_PEAK_WEEKS + Math.max(0, diff));
  if (peakingWeeks > STANDARD_PEAK_WEEKS) {
    adjustments.push(`Peak block extended to ${peakingWeeks} weeks to fit your timeline.`);
  }

  // If peakingWeeks was capped (very long timeline), start the schedule later so
  // the dates still land correctly relative to meet day.
  const actualTrainWeeks = [...waveLengths.values()].reduce((a, b) => a + b, 0);
  const scheduledWeeks = actualTrainWeeks + peakingWeeks + MEET_WEEK;
  const startOffset = totalAvailableWeeks - scheduledWeeks;

  // Build training wave blocks
  const weeks: WeekBlock[] = [];
  let weekIndex = startOffset;

  for (const wave of selectedWaves) {
    const length = waveLengths.get(wave)!;
    const phases = length === 3 ? COMPRESSED_PHASES : STANDARD_PHASES;

    for (const phase of phases) {
      const weekStart = new Date(startDate.getTime() + weekIndex * MS_PER_WEEK);
      const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK - 1);
      weeks.push({ wave: wave as RepWave, phase, weekIndex, startDate: weekStart, endDate: weekEnd });
      weekIndex++;
    }
  }

  const peakWeekIndex = weeks.length; // peaking block starts right after the training waves

  // Append peaking weeks (2–6, based on available time)
  for (let pk = 1; pk <= peakingWeeks; pk++) {
    const weekStart = new Date(startDate.getTime() + weekIndex * MS_PER_WEEK);
    const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK - 1);
    weeks.push({
      wave: 3,
      phase: 'peaking',
      peakWeek: pk,
      totalPeakWeeks: peakingWeeks,
      weekIndex,
      startDate: weekStart,
      endDate: weekEnd,
    });
    weekIndex++;
  }

  // Append meet week
  const meetWeekStart = new Date(startDate.getTime() + weekIndex * MS_PER_WEEK);
  const meetWeekEnd = new Date(meetWeekStart.getTime() + MS_PER_WEEK - 1);
  weeks.push({
    wave: 3,
    phase: 'meet_week',
    weekIndex,
    startDate: meetWeekStart,
    endDate: meetWeekEnd,
  });
  weekIndex++;

  return { weeks, skippedWaves, adjustments, totalWeeks: weekIndex, peakWeekIndex };
}
