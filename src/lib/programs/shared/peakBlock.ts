import type { WeekBlock } from '../../types';
import { MS_PER_WEEK } from './rounding';

// Block layout shared by programs that count whole training cycles back from a
// meet: waves first, then a peak block and a meet week. Juggernaut keeps its
// own inline version (its output is pinned by golden tests); this is the same
// rule set for programs built after it.
export const STANDARD_PEAK_WEEKS = 3;
export const MAX_PEAK_WEEKS = 6;
export const MEET_WEEKS = 1;

export interface PeakPlan {
  /** Whole cycles that fit before the peak block. 0 means nothing fits. */
  cycles: number;
  peakWeeks: number;
  /** Weeks of the timeline before the first scheduled week (very long timelines). */
  startOffset: number;
  notes: string[];
}

/**
 * Fits `cycleLength`-week cycles before a peak block and meet week.
 * Leftover weeks extend the peak block (up to 6 weeks); anything beyond that
 * pushes the first scheduled week later, so dates still land on meet day.
 */
export function planPeakBlock(totalWeeks: number, cycleLength: number): PeakPlan {
  const available = totalWeeks - STANDARD_PEAK_WEEKS - MEET_WEEKS;
  const cycles = Math.floor(available / cycleLength);
  if (cycles < 1) {
    return {
      cycles: 0, peakWeeks: 0, startOffset: 0,
      notes: ['Not enough time to run a full training cycle before your peaking block. Consider starting earlier.'],
    };
  }
  const surplus = available - cycles * cycleLength;
  const peakWeeks = Math.min(MAX_PEAK_WEEKS, STANDARD_PEAK_WEEKS + surplus);
  const notes: string[] = [];
  if (peakWeeks > STANDARD_PEAK_WEEKS) notes.push(`Peak block extended to ${peakWeeks} weeks to fit your timeline.`);
  const scheduled = cycles * cycleLength + peakWeeks + MEET_WEEKS;
  return { cycles, peakWeeks, startOffset: totalWeeks - scheduled, notes };
}

/** Peaking weeks followed by the meet week, starting at `firstIndex`. */
export function buildPeakWeeks(
  startDate: Date,
  firstIndex: number,
  cycleIndex: number,
  peakWeeks: number
): WeekBlock[] {
  const at = (i: number) => {
    const s = new Date(startDate.getTime() + i * MS_PER_WEEK);
    return { startDate: s, endDate: new Date(s.getTime() + MS_PER_WEEK - 1) };
  };
  const weeks: WeekBlock[] = [];
  let index = firstIndex;
  for (let pk = 1; pk <= peakWeeks; pk++) {
    weeks.push({ phase: 'peaking', peakWeek: pk, totalPeakWeeks: peakWeeks, weekIndex: index, cycleIndex, ...at(index) });
    index++;
  }
  weeks.push({ phase: 'meet_week', weekIndex: index, cycleIndex, ...at(index) });
  return weeks;
}
