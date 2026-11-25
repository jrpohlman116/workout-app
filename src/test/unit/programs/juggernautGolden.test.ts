import { describe, it, expect } from 'vitest';
import {
  buildWaveSchedule,
  calculateJuggernautSets,
  calculatePeakingSets,
  calculateBackoffSets,
  calculateNewTrainingMax,
  calculateWarmupSets,
  applyVariationCredit,
  getPeakingWeekNote,
  isWaveBoundaryAdvance,
  type RepWave,
  type WavePhase,
} from '../../../lib/calculations';

// Golden snapshots of the Juggernaut engine's outputs. They were captured
// before the logic moved into src/lib/programs/ and must not change as part
// of the multi-program refactor (see SDD - Multi-program architecture, step 1).
// If one of these fails, the refactor changed behavior: fix the code, don't
// update the snapshot.

const WAVES: RepWave[] = [10, 8, 5, 3];
const PHASES: WavePhase[] = ['accumulation', 'intensification', 'realization', 'deload'];
const LIFTS = ['squat', 'bench', 'deadlift', 'upper'] as const;
const TMS = { lb: [240, 147.5, 255, 183], kg: [110, 67.5, 117.5, 82.5] } as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('Juggernaut golden: calculateJuggernautSets', () => {
  it('matches for every wave, phase, TM and unit', () => {
    const out: Record<string, unknown> = {};
    for (const unit of ['lb', 'kg'] as const) {
      for (const tm of TMS[unit]) {
        for (const wave of WAVES) {
          for (const phase of PHASES) {
            out[`${unit}/${tm}/${wave}/${phase}`] = calculateJuggernautSets(wave, phase, tm, unit);
          }
        }
      }
    }
    expect(out).toMatchSnapshot();
  });
});

describe('Juggernaut golden: calculatePeakingSets and notes', () => {
  it('matches for every peak week position, total, lift and unit', () => {
    const out: Record<string, unknown> = {};
    for (const unit of ['lb', 'kg'] as const) {
      for (const total of [2, 3, 4, 5, 6]) {
        for (let peakWeek = 1; peakWeek <= total; peakWeek++) {
          for (const lift of LIFTS) {
            out[`${unit}/${total}/${peakWeek}/${lift}`] = {
              sets: calculatePeakingSets(peakWeek, total, TMS[unit][0], unit, lift),
              note: getPeakingWeekNote(peakWeek, total, lift),
            };
          }
        }
      }
    }
    expect(out).toMatchSnapshot();
  });
});

describe('Juggernaut golden: buildWaveSchedule', () => {
  it('matches for meet dates 2 to 30 weeks out', () => {
    const start = new Date('2026-01-05T00:00:00.000Z');
    const out: Record<string, unknown> = {};
    for (let weeks = 2; weeks <= 30; weeks++) {
      const meet = new Date(start.getTime() + weeks * 7 * MS_PER_DAY + 3 * MS_PER_DAY);
      const s = buildWaveSchedule(start, meet);
      out[`${weeks}w`] = {
        skippedWaves: s.skippedWaves,
        adjustments: s.adjustments,
        totalWeeks: s.totalWeeks,
        peakWeekIndex: s.peakWeekIndex,
        weeks: s.weeks.map(w => ({
          wave: w.wave,
          phase: w.phase,
          weekIndex: w.weekIndex,
          peakWeek: w.peakWeek,
          totalPeakWeeks: w.totalPeakWeeks,
          start: w.startDate.toISOString(),
          end: w.endDate.toISOString(),
        })),
      };
    }
    expect(out).toMatchSnapshot();
  });
});

describe('Juggernaut golden: progression and back-offs', () => {
  it('calculateNewTrainingMax matches for rep deltas, lifts and units', () => {
    const out: Record<string, number> = {};
    for (const unit of ['lb', 'kg'] as const) {
      for (const lift of ['squat', 'bench', 'deadlift']) {
        for (const wave of WAVES) {
          for (let reps = 0; reps <= 20; reps++) {
            out[`${unit}/${lift}/${wave}/${reps}`] = calculateNewTrainingMax(TMS[unit][0], wave, reps, unit, lift);
          }
        }
      }
    }
    expect(out).toMatchSnapshot();
  });

  it('calculateBackoffSets matches for every RPE and unit', () => {
    const out: Record<string, unknown> = {};
    for (const unit of ['lb', 'kg'] as const) {
      for (const top of [185, 215, 232.5, 315]) {
        for (let rpe = 5; rpe <= 10; rpe++) {
          out[`${unit}/${top}/${rpe}`] = calculateBackoffSets(top, rpe, unit);
        }
      }
    }
    expect(out).toMatchSnapshot();
  });

  it('applyVariationCredit matches across set counts, credit and caps', () => {
    const out: Record<string, unknown> = {};
    for (const base of [3, 4, 5, 6]) {
      for (const planned of [0, 1, 2, 3, 6, 10]) {
        for (const cap of [Infinity, 1, 2]) {
          out[`${base}/${planned}/${cap}`] = applyVariationCredit(base, planned, cap);
        }
      }
    }
    expect(out).toMatchSnapshot();
  });

  it('isWaveBoundaryAdvance matches for every phase pair', () => {
    const all: (WavePhase | undefined)[] = [...PHASES, 'peaking', 'meet_week', undefined];
    const out: Record<string, boolean> = {};
    for (const a of PHASES.concat(['peaking', 'meet_week'])) {
      for (const b of all) out[`${a}->${b}`] = isWaveBoundaryAdvance(a, b);
    }
    expect(out).toMatchSnapshot();
  });
});

describe('Juggernaut golden: warm-up ramps', () => {
  it('calculateWarmupSets matches for every lift, unit and top set', () => {
    const out: Record<string, unknown> = {};
    for (const unit of ['lb', 'kg'] as const) {
      for (const lift of ['squat', 'bench', 'deadlift', 'upper', 'ohp']) {
        for (const top of [100, 185, 232.5, 315]) {
          const w = calculateWarmupSets(top, unit, lift);
          out[`${unit}/${lift}/${top}`] = {
            fixedSets: w.fixedSets,
            approach: (['easy', 'good', 'bad'] as const).map(f => w.getApproachWeight(f)),
            working: (['easy', 'good', 'bad'] as const).flatMap(a =>
              (['easy', 'good', 'bad'] as const).map(b => w.getAdjustedWorkingWeight(a, b))
            ),
            approachWeights: w.approachWeights,
          };
        }
      }
    }
    expect(out).toMatchSnapshot();
  });
});

it('golden suite sanity: a known value', () => {
  expect(calculateJuggernautSets(10, 'accumulation', 240, 'lb').weight).toBe(145);
});
