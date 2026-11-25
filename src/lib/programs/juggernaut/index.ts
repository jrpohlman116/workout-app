import type { RepWave } from '../../types';
import { MEET_WEEK_TM_PCT } from '../../constants';
import { getRoundingIncrement } from '../shared/rounding';
import { calculatePeakingSets } from '../shared/peaking';
import type { Prescription, ProgramDefinition, SetGroup } from '../types';
import { JUGGERNAUT_4_DAY } from './layouts';
import {
  buildWaveSchedule,
  calculateJuggernautSets,
  calculateNewTrainingMax,
  isWaveBoundaryAdvance,
} from './engine';

const EMPTY_SCHEDULE = { weeks: [], adjustments: [], skippedWaves: [], totalWeeks: 0, peakWeekIndex: -1 };

export const juggernaut: ProgramDefinition = {
  id: 'juggernaut',
  name: 'Juggernaut',
  summary: 'Four-week waves of 10s, 8s, 5s and 3s, with an AMRAP test set that sets your next training max.',
  supportedDays: [4],

  layout(days) {
    if (days === 4) return JUGGERNAUT_4_DAY;
    throw new Error(`Juggernaut does not support ${days} days per week`);
  },

  buildSchedule({ startDate, meetDate }) {
    // Without a meet date the program is the repeating manual cycle, which the
    // pages still derive themselves until step 2 folds it into the schedule.
    return meetDate ? buildWaveSchedule(startDate, meetDate) : EMPTY_SCHEDULE;
  },

  prescribe({ block, lift, trainingMax, unit }): Prescription {
    if (block.phase === 'meet_week') {
      const roundTo = getRoundingIncrement(unit);
      return {
        groups: [{
          kind: 'top', sets: 1, reps: 1, isAmrap: false, stopRule: 'fixed',
          weight: Math.round(trainingMax * MEET_WEEK_TM_PCT / roundTo) * roundTo,
        }],
      };
    }

    const cfg = block.phase === 'peaking'
      ? calculatePeakingSets(block.peakWeek ?? 1, block.totalPeakWeeks ?? 3, trainingMax, unit, lift)
      : calculateJuggernautSets(block.wave as RepWave, block.phase, trainingMax, unit);

    const groups: SetGroup[] = [{
      kind: 'top', sets: cfg.numSets, reps: cfg.reps, weight: cfg.weight, isAmrap: cfg.isAmap, stopRule: 'fixed',
    }];
    if (cfg.downSets) {
      groups.push({
        kind: 'backoff', sets: cfg.downSets.sets, reps: cfg.downSets.reps, weight: cfg.downSets.weight,
        isAmrap: false, stopRule: 'fixed',
      });
    }
    return { groups };
  },

  updateTrainingMax({ lift, currentTm, block, topSet, unit }) {
    if (block.phase !== 'realization' || block.wave == null) return null;
    const newTm = calculateNewTrainingMax(currentTm, block.wave, topSet.reps, unit, lift);
    const reason = newTm > currentTm ? 'increase' : newTm < currentTm ? 'decrease' : 'hold';
    return {
      newTm,
      reason,
      explanation: `${topSet.reps} reps against a ${block.wave}-rep target moves your training max by one plate step per rep difference.`,
    };
  },

  initialState: () => ({}),

  isWaveBoundary: isWaveBoundaryAdvance,
};
