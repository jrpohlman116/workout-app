import type { JuggernautSetsConfig } from '../../types';
import { getRoundingIncrement } from './rounding';

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
  const topPct = liftType === 'bench' || liftType === 'upper' || liftType === 'ohp' ? week.top.bench : week.top.squatDead;

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
  const isBench = liftType === 'bench' || liftType === 'upper' || liftType === 'ohp';
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
