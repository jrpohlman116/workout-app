import type { RepWave, WavePhase, WeekBlock, WaveSchedule, BackoffSet, JuggernautSetsConfig } from '../../types';
import { getRoundingIncrement, MS_PER_WEEK } from '../shared/rounding';

// Juggernaut Method engine. Moved from src/lib/calculations.ts; the golden tests
// in src/test/unit/programs guard that its output is unchanged. The only
// addition since the move is WeekBlock.cycleIndex.

const STANDARD_PHASES: WavePhase[] = ['accumulation', 'intensification', 'realization', 'deload'];
const COMPRESSED_PHASES: WavePhase[] = ['accumulation', 'realization', 'deload'];

/**
 * Calculates the new training max after a Realization week AMRAP set.
 * Each rep above (or below) the wave's standard AMRAP target shifts the
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
  const perRep = liftType === 'bench' || liftType === 'ohp' ? roundTo / 2 : roundTo;
  const raw = currentTrainingMax + (actualReps - standardReps) * perRep;
  return Math.ceil(raw / roundTo) * roundTo;
}

const JUGGERNAUT_WAVE_PERCENTS: Record<RepWave, {
  accumulation: { sets: number; pct: number };
  intensification: { sets: number; pct: number };
  realization: { pct: number };
  deload: { sets: number; pct: number };
}> = {
  10: { accumulation: { sets: 5, pct: 0.60 }, intensification: { sets: 4, pct: 0.675 }, realization: { pct: 0.75 }, deload: { sets: 3, pct: 0.45 } },
  8:  { accumulation: { sets: 5, pct: 0.65 }, intensification: { sets: 4, pct: 0.725 }, realization: { pct: 0.80 }, deload: { sets: 3, pct: 0.50 } },
  5:  { accumulation: { sets: 6, pct: 0.70 }, intensification: { sets: 5, pct: 0.775 }, realization: { pct: 0.85 }, deload: { sets: 3, pct: 0.50 } },
  3:  { accumulation: { sets: 6, pct: 0.75 }, intensification: { sets: 5, pct: 0.825 }, realization: { pct: 0.90 }, deload: { sets: 3, pct: 0.55 } },
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

/**
 * Redistributes main-lift volume when barbell variations of the same lift
 * are already planned elsewhere in the week (accumulation/intensification
 * only — the caller decides eligibility; realization's AMRAP, deload,
 * peaking, and meet week always run the full competition-lift prescription
 * regardless of what this returns). Never drops the main lift below ~60%
 * of its own prescribed sets, so the competition lift keeps specificity
 * priority even when variation credit is generous.
 */
export function applyVariationCredit(
  baseNumSets: number,
  variationSetsPlanned: number,
  maxReduction: number = Infinity
): { numSets: number; reducedBy: number } {
  if (variationSetsPlanned <= 0) return { numSets: baseNumSets, reducedBy: 0 };
  const specificityFloor = Math.max(1, Math.ceil(baseNumSets * 0.6), baseNumSets - maxReduction);
  const numSets = Math.max(specificityFloor, baseNumSets - variationSetsPlanned);
  return { numSets, reducedBy: baseNumSets - numSets };
}

/**
 * True when advancing now starts a brand-new rep wave (not peaking/meet
 * week) — the point where weak-point-driven accessory selection should be
 * re-checked. A new wave always follows a deload; deload into peaking (end
 * of the 3-rep wave) or meet_week is not a wave boundary.
 */
export function isWaveBoundaryAdvance(leavingPhase: WavePhase, enteringPhase: WavePhase | undefined): boolean {
  return leavingPhase === 'deload' && enteringPhase === 'accumulation';
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
  let cycleIndex = 0;

  for (const wave of selectedWaves) {
    const length = waveLengths.get(wave)!;
    const phases = length === 3 ? COMPRESSED_PHASES : STANDARD_PHASES;

    for (const phase of phases) {
      const weekStart = new Date(startDate.getTime() + weekIndex * MS_PER_WEEK);
      const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK - 1);
      weeks.push({ wave: wave as RepWave, phase, weekIndex, cycleIndex, startDate: weekStart, endDate: weekEnd });
      weekIndex++;
    }
    cycleIndex++;
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
      cycleIndex,
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
    cycleIndex,
    startDate: meetWeekStart,
    endDate: meetWeekEnd,
  });
  weekIndex++;

  return { weeks, skippedWaves, adjustments, totalWeeks: weekIndex, peakWeekIndex };
}
