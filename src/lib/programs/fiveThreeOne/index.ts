import { MEET_WEEK_TM_PCT, PHASE_LABELS } from '../../constants';
import type { WeekBlock, WaveSchedule } from '../../types';
import { MS_PER_WEEK } from '../shared/rounding';
import { calculatePeakingSets } from '../shared/peaking';
import { buildPeakWeeks, planPeakBlock } from '../shared/peakBlock';
import type { Prescription, ProgramDefinition, SetGroup } from '../types';
import { FIVE_THREE_ONE_3_DAY, FIVE_THREE_ONE_4_DAY } from './layouts';
import { AMRAP_MINIMUM, CYCLE_LENGTH, WAVE, WAVE_ORDER, nextTrainingMax, roundLoad } from './engine';

// Without a meet date the program just repeats; a year of weeks is far more
// than anyone pages through, and the position pointer is clamped to it.
const REPEATING_CYCLES = 13;

function weekAt(startDate: Date, index: number, cycleIndex: number, phase: WeekBlock['phase']): WeekBlock {
  const start = new Date(startDate.getTime() + index * MS_PER_WEEK);
  return { phase, weekIndex: index, cycleIndex, startDate: start, endDate: new Date(start.getTime() + MS_PER_WEEK - 1) };
}

function cycleWeeks(startDate: Date, firstIndex: number, cycles: number): WeekBlock[] {
  const weeks: WeekBlock[] = [];
  for (let c = 0; c < cycles; c++) {
    WAVE_ORDER.forEach((phase, i) => weeks.push(weekAt(startDate, firstIndex + c * CYCLE_LENGTH + i, c, phase)));
  }
  return weeks;
}

function emptySchedule(note: string): WaveSchedule {
  return { weeks: [], adjustments: [note], skippedWaves: [], totalWeeks: 0, peakWeekIndex: -1 };
}

export const fiveThreeOne: ProgramDefinition = {
  id: 'five_three_one',
  name: '5/3/1',
  summary: 'Four-week waves of 5s, 3s and an AMRAP test set, with a deload. The test set sets your next training max.',
  supportedDays: [3, 4],

  layout(days) {
    if (days === 3) return FIVE_THREE_ONE_3_DAY;
    if (days === 4) return FIVE_THREE_ONE_4_DAY;
    throw new Error(`5/3/1 does not support ${days} days per week`);
  },

  weekLabel(block) {
    if (block.phase === 'meet_week') return 'Meet Week';
    if (block.phase === 'peaking') return `Peaking Week ${block.peakWeek}`;
    return PHASE_LABELS[block.phase];
  },

  waveLabel: block =>
    block.phase === 'peaking' || block.phase === 'meet_week' || block.cycleIndex == null
      ? undefined
      : `Wave ${block.cycleIndex + 1}`,

  buildSchedule({ startDate, meetDate }): WaveSchedule {
    if (!meetDate) {
      const weeks = cycleWeeks(startDate, 0, REPEATING_CYCLES);
      return { weeks, adjustments: [], skippedWaves: [], totalWeeks: weeks.length, peakWeekIndex: -1, repeats: true };
    }

    const totalWeeks = Math.floor((meetDate.getTime() - startDate.getTime()) / MS_PER_WEEK);
    const plan = planPeakBlock(totalWeeks, CYCLE_LENGTH);
    if (plan.cycles < 1) return emptySchedule(plan.notes[0]);

    const waves = cycleWeeks(startDate, plan.startOffset, plan.cycles);
    const peak = buildPeakWeeks(startDate, plan.startOffset + waves.length, plan.cycles, plan.peakWeeks);
    const weeks = [...waves, ...peak];
    return {
      weeks,
      adjustments: plan.notes,
      skippedWaves: [],
      totalWeeks: plan.startOffset + weeks.length,
      peakWeekIndex: waves.length,
    };
  },

  prescribe({ block, lift, trainingMax, unit }): Prescription {
    if (block.phase === 'meet_week') {
      return {
        groups: [{
          kind: 'top', sets: 1, reps: 1, isAmrap: false, stopRule: 'fixed',
          weight: roundLoad(trainingMax * MEET_WEEK_TM_PCT, lift, unit),
        }],
      };
    }

    if (block.phase === 'peaking') {
      // The shared taper rounds to the full plate step, bench included.
      const cfg = calculatePeakingSets(block.peakWeek ?? 1, block.totalPeakWeeks ?? 3, trainingMax, unit, lift);
      const groups: SetGroup[] = [{ kind: 'top', sets: cfg.numSets, reps: cfg.reps, weight: cfg.weight, isAmrap: false, stopRule: 'fixed' }];
      if (cfg.downSets) {
        groups.push({ kind: 'backoff', sets: cfg.downSets.sets, reps: cfg.downSets.reps, weight: cfg.downSets.weight, isAmrap: false, stopRule: 'fixed' });
      }
      return { groups };
    }

    const week = WAVE[block.phase as keyof typeof WAVE];
    if (!week) return { groups: [] };
    return {
      groups: [
        {
          kind: 'top', sets: 1, reps: week.top.reps, weight: roundLoad(trainingMax * week.top.pct, lift, unit),
          isAmrap: week.top.isAmrap, minReps: week.top.isAmrap ? AMRAP_MINIMUM : undefined, stopRule: 'fixed',
        },
        {
          kind: 'backoff', sets: week.backoff.sets, reps: week.backoff.reps,
          weight: roundLoad(trainingMax * week.backoff.pct, lift, unit), isAmrap: false, stopRule: 'fixed',
        },
      ],
    };
  },

  updateTrainingMax({ lift, currentTm, block, topSet, history, unit }) {
    if (block.phase !== 'realization') return null;
    return nextTrainingMax({ lift, currentTm, topSet, history, unit });
  },

  initialState: () => ({}),

  isWaveBoundary: (leaving, entering) => leaving === 'deload' && entering === 'accumulation',
};
