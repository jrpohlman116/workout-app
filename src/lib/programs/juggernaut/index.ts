import type { RepWave } from '../../types';
import { MEET_WEEK_TM_PCT, PHASE_LABELS, WAVE_LABELS, CYCLE_TO_WAVE } from '../../constants';
import type { WaveSchedule, WeekBlock, WavePhase } from '../../types';
import { MS_PER_WEEK } from '../shared/rounding';
import { getRoundingIncrement } from '../shared/rounding';
import { calculatePeakingSets } from '../shared/peaking';
import type { Prescription, ProgramDefinition, SetGroup } from '../types';
import { JUGGERNAUT_3_DAY, JUGGERNAUT_4_DAY } from './layouts';
import {
  buildWaveSchedule,
  calculateJuggernautSets,
  calculateNewTrainingMax,
  isWaveBoundaryAdvance,
} from './engine';

// With no meet date the program is a repeating run of four-week waves, with no
// peak block: 10s, 8s, 5s, 3s, then 3s again (the same mapping the manual
// cycle counter has always used). Two years of cycles is far more than the
// position pointer will reach.
const REPEATING_CYCLES = 26;
const WAVE_PHASES: WavePhase[] = ['accumulation', 'intensification', 'realization', 'deload'];

function repeatingSchedule(startDate: Date): WaveSchedule {
  const weeks: WeekBlock[] = [];
  for (let cycle = 0; cycle < REPEATING_CYCLES; cycle++) {
    const wave = CYCLE_TO_WAVE[cycle + 1] ?? 3;
    WAVE_PHASES.forEach((phase, i) => {
      const index = cycle * WAVE_PHASES.length + i;
      const start = new Date(startDate.getTime() + index * MS_PER_WEEK);
      weeks.push({ wave, phase, weekIndex: index, cycleIndex: cycle, startDate: start, endDate: new Date(start.getTime() + MS_PER_WEEK - 1) });
    });
  }
  return { weeks, adjustments: [], skippedWaves: [], totalWeeks: weeks.length, peakWeekIndex: -1, repeats: true };
}

export const juggernaut: ProgramDefinition = {
  id: 'juggernaut',
  name: 'Juggernaut',
  summary: 'Four-week waves of 10s, 8s, 5s and 3s, with an AMRAP test set that sets your next training max.',
  supportedDays: [3, 4],

  layout(days) {
    if (days === 3) return JUGGERNAUT_3_DAY;
    if (days === 4) return JUGGERNAUT_4_DAY;
    throw new Error(`Juggernaut does not support ${days} days per week`);
  },

  weekLabel(block) {
    if (block.phase === 'meet_week') return 'Meet Week';
    if (block.phase === 'peaking') return `Peaking Week ${block.peakWeek}`;
    return `${block.wave}-Rep ${PHASE_LABELS[block.phase]}`;
  },

  waveLabel: block => (block.wave ? WAVE_LABELS[block.wave] : undefined),

  buildSchedule({ startDate, meetDate }) {
    return meetDate ? buildWaveSchedule(startDate, meetDate) : repeatingSchedule(startDate);
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
