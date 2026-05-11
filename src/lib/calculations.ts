export function calculateOneRepMax(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

export function calculateTrainingMax(oneRepMax: number): number {
  return Math.round(oneRepMax * 0.9);
}

export function getCycleProgression(cycle: number, type: string, unit: string = 'lb'): number {
  const isUpperBody = type === 'bench' || type === 'ohp';

  if (unit === 'kg') {
    return (cycle - 1) * (isUpperBody ? 2.5 : 5);
  }

  return (cycle - 1) * (isUpperBody ? 5 : 10);
}

export function calculateWorkoutWeights(
  type: string,
  oneRepMax: number,
  cycle: number,
  week: number,
  unit: string = 'lb'
): { set1: number; set2: number; set3: number } {
  const trainingMax = calculateTrainingMax(oneRepMax) + getCycleProgression(cycle, type, unit);
  const roundTo = unit === 'kg' ? 2.5 : 5;

  if (week === 1) {
    return {
      set1: Math.round(trainingMax * 0.65 / roundTo) * roundTo,
      set2: Math.round(trainingMax * 0.75 / roundTo) * roundTo,
      set3: Math.round(trainingMax * 0.85 / roundTo) * roundTo,
    };
  } else if (week === 2) {
    return {
      set1: Math.round(trainingMax * 0.70 / roundTo) * roundTo,
      set2: Math.round(trainingMax * 0.80 / roundTo) * roundTo,
      set3: Math.round(trainingMax * 0.90 / roundTo) * roundTo,
    };
  } else if (week === 3) {
    return {
      set1: Math.round(trainingMax * 0.75 / roundTo) * roundTo,
      set2: Math.round(trainingMax * 0.85 / roundTo) * roundTo,
      set3: Math.round(trainingMax * 0.95 / roundTo) * roundTo,
    };
  } else {
    return {
      set1: Math.round(trainingMax * 0.40 / roundTo) * roundTo,
      set2: Math.round(trainingMax * 0.50 / roundTo) * roundTo,
      set3: Math.round(trainingMax * 0.60 / roundTo) * roundTo,
    };
  }
}

export function getWeekSubtext(week: number): string {
  if (week === 1) return '5 reps';
  if (week === 2) return '3 reps';
  if (week === 3) return '5-3-1 reps';
  return 'deload';
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

export function calculateWilks2Score(
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
    a = -125.4255398;
    b = 13.71219419;
    c = -0.03307250631;
    d = -0.001050400051;
    e = 9.38773881462799e-6;
    f = -2.3334613884954e-8;
  } else {
    a = 47.46178854;
    b = 8.472061379;
    c = 0.07369410346;
    d = -0.001395833811;
    e = 7.07665973070743e-6;
    f = -1.20804336482315e-8;
  }

  const denominator = a + b * bodyweight + c * Math.pow(bodyweight, 2) +
    d * Math.pow(bodyweight, 3) + e * Math.pow(bodyweight, 4) +
    f * Math.pow(bodyweight, 5);

  const wilks2Coefficient = 600 / denominator;

  return Math.round((total * wilks2Coefficient) * 100) / 100;
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

export type RepWave = 10 | 8 | 5 | 3;
export type WavePhase = 'accumulation' | 'intensification' | 'realization' | 'deload';

export interface WeekBlock {
  wave: RepWave;
  phase: WavePhase;
  weekIndex: number;
  startDate: Date;
  endDate: Date;
}

export interface WaveSchedule {
  weeks: WeekBlock[];
  skippedWaves: RepWave[];
  adjustments: string[];
  totalWeeks: number;
  peakWeekIndex: number;
}

export interface BackoffSet {
  weight: number;
  sets: number;
  reps: number;
}

export interface WarmupSet {
  weight: number;
  reps: number;
  percentage?: number;
}

export interface WarmupProgression {
  fixedSets: WarmupSet[];
  approachWeights: {
    smooth: number;
    tough: number;
  };
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const STANDARD_PHASES: WavePhase[] = ['accumulation', 'intensification', 'realization', 'deload'];
const COMPRESSED_PHASES: WavePhase[] = ['accumulation', 'realization', 'deload'];
const ELONGATED_PHASES: WavePhase[] = ['accumulation', 'accumulation', 'intensification', 'realization', 'deload'];

/**
 * Calculates the new training max after a Realization week AMAP set.
 * Uses Epley formula to estimate 1RM, then takes 90%.
 */
export function calculateNewTrainingMax(amapWeight: number, amapReps: number): number {
  return calculateTrainingMax(calculateOneRepMax(amapWeight, amapReps));
}

export interface JuggernautSetsConfig {
  numSets: number;
  reps: number;
  weight: number;
  isAmap: boolean;
}

const JUGGERNAUT_WAVE_PERCENTS: Record<RepWave, {
  accumulation: { sets: number; pct: number };
  intensification: { sets: number; pct: number };
  realization: { pct: number };
  deload: { sets: number; pct: number };
}> = {
  10: { accumulation: { sets: 5, pct: 0.60 }, intensification: { sets: 3, pct: 0.65 }, realization: { pct: 0.70 }, deload: { sets: 3, pct: 0.45 } },
  8:  { accumulation: { sets: 5, pct: 0.65 }, intensification: { sets: 4, pct: 0.70 }, realization: { pct: 0.75 }, deload: { sets: 3, pct: 0.50 } },
  5:  { accumulation: { sets: 5, pct: 0.70 }, intensification: { sets: 4, pct: 0.75 }, realization: { pct: 0.80 }, deload: { sets: 3, pct: 0.50 } },
  3:  { accumulation: { sets: 5, pct: 0.75 }, intensification: { sets: 4, pct: 0.80 }, realization: { pct: 0.85 }, deload: { sets: 3, pct: 0.55 } },
};

export function calculateJuggernautSets(
  wave: RepWave,
  phase: WavePhase,
  trainingMax: number,
  unit: string = 'lb'
): JuggernautSetsConfig {
  const roundTo = unit === 'kg' ? 2.5 : 5;
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
  const roundTo = unit === 'kg' ? 2.5 : 5;

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
  const roundTo = unit === 'kg' ? 2.5 : 5;
  const bar = unit === 'kg' ? 20 : 45;

  const fixedSets: WarmupSet[] = [
    { weight: bar, reps: 10, percentage: 0 },
    { weight: Math.round(topSetWeight * 0.5 / roundTo) * roundTo, reps: 5, percentage: 50 },
    { weight: Math.round(topSetWeight * 0.67 / roundTo) * roundTo, reps: 3, percentage: 67 },
    { weight: Math.round(topSetWeight * 0.82 / roundTo) * roundTo, reps: 2, percentage: 82 },
  ];

  const approachWeights = {
    smooth: Math.round(topSetWeight * 0.95 / roundTo) * roundTo,
    tough: Math.round(topSetWeight * 0.93 / roundTo) * roundTo,
  };

  return { fixedSets, approachWeights };
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
  const availableWeeks = Math.floor(
    (meetDate.getTime() - startDate.getTime()) / MS_PER_WEEK
  );

  const adjustments: string[] = [];
  const skippedWaves: RepWave[] = [];

  if (availableWeeks < 3) {
    return { weeks: [], skippedWaves: [10, 8, 5, 3], adjustments: ['Not enough time to run any wave before your meet date.'], totalWeeks: 0, peakWeekIndex: -1 };
  }

  // Select waves — minimum 3 weeks per wave, so thresholds are multiples of 3
  let selectedWaves: RepWave[];

  if (availableWeeks >= 12) {
    selectedWaves = [10, 8, 5, 3];
  } else if (availableWeeks >= 9) {
    selectedWaves = [8, 5, 3];
    skippedWaves.push(10);
    adjustments.push(
      `Your timeline is ${availableWeeks} weeks. The 10-rep wave was skipped so there's enough time for full 8-rep, 5-rep, and 3-rep waves before your meet.`
    );
  } else if (availableWeeks >= 6) {
    selectedWaves = [5, 3];
    skippedWaves.push(10, 8);
    adjustments.push(
      `Your timeline is ${availableWeeks} weeks. The 10-rep and 8-rep waves were skipped so you can run a full 5-rep and 3-rep wave before your meet.`
    );
  } else {
    selectedWaves = [3];
    skippedWaves.push(10, 8, 5);
    adjustments.push(
      `Your timeline is ${availableWeeks} weeks. Only the 3-rep wave fits before your meet.`
    );
  }

  // Fit wave lengths to available time
  const waveLengths = new Map<RepWave, number>(selectedWaves.map(w => [w, 4]));
  const standardTotal = selectedWaves.length * 4;
  const diff = availableWeeks - standardTotal;

  if (diff > 0) {
    // Elongate waves (max 5 weeks each), prioritising earlier waves
    let extra = diff;
    for (const wave of selectedWaves) {
      if (extra <= 0) break;
      if (waveLengths.get(wave)! < 5) {
        waveLengths.set(wave, 5);
        extra--;
        adjustments.push(
          `The ${wave}-rep wave was extended to 5 weeks (an extra accumulation week was added) to fill your timeline.`
        );
      }
    }
  } else if (diff < 0) {
    // Compress waves (min 3 weeks each), prioritising earlier waves
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

  // Build week-by-week blocks with dates
  const weeks: WeekBlock[] = [];
  let weekIndex = 0;

  for (const wave of selectedWaves) {
    const length = waveLengths.get(wave)!;
    const phases =
      length === 3 ? COMPRESSED_PHASES :
      length === 5 ? ELONGATED_PHASES :
      STANDARD_PHASES;

    for (const phase of phases) {
      const weekStart = new Date(startDate.getTime() + weekIndex * MS_PER_WEEK);
      const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK - 1);
      weeks.push({ wave, phase, weekIndex, startDate: weekStart, endDate: weekEnd });
      weekIndex++;
    }
  }

  const peakWeekIndex = weeks.reduce(
    (found, w, i) => w.wave === 3 && w.phase === 'realization' ? i : found,
    -1
  );

  return { weeks, skippedWaves, adjustments, totalWeeks: weekIndex, peakWeekIndex };
}

export function calculateBBBSupplementalWeight(
  type: string,
  oneRepMax: number,
  cycle: number,
  unit: string = 'lb'
): number {
  const trainingMax = calculateTrainingMax(oneRepMax) + getCycleProgression(cycle, type, unit);
  const roundTo = unit === 'kg' ? 2.5 : 5;
  return Math.round(trainingMax * 0.50 / roundTo) * roundTo;
}

export function calculateBBSSupplementalWeight(
  type: string,
  oneRepMax: number,
  cycle: number,
  week: number,
  unit: string = 'lb'
): number {
  const weights = calculateWorkoutWeights(type, oneRepMax, cycle, week, unit);
  return weights.set1;
}

export function getSupplementalWorkConfig(
  variation: 'standard' | 'bbb' | 'bbs' | undefined
): { sets: number; reps: number } | null {
  if (variation === 'bbb') {
    return { sets: 5, reps: 10 };
  }
  if (variation === 'bbs') {
    return { sets: 10, reps: 5 };
  }
  return null;
}
