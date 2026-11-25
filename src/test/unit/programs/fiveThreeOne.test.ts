import { describe, it, expect } from 'vitest';
import { getProgram } from '../../../lib/programs/registry';
import {
  nextTrainingMax, hasSecondSignal, roundLoad, loadIncrement, fixedIncrement, epley, WAVE,
} from '../../../lib/programs/fiveThreeOne/engine';
import { planPeakBlock } from '../../../lib/programs/shared/peakBlock';
import type { SessionSummary, WeekBlock, LiftId } from '../../../lib/programs/types';

// Fixtures straight from the Ironform programming-logic handoff (worked example).
// Starting 1RMs 265 squat, 285 deadlift, 165 bench give TMs 240, 255 and 147.5.
const program = getProgram('five_three_one');
const TM: Record<'squat' | 'bench' | 'deadlift', number> = { squat: 240, bench: 147.5, deadlift: 255 };
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

const block = (phase: WeekBlock['phase'], extra: Partial<WeekBlock> = {}): WeekBlock => ({
  phase, weekIndex: 0, startDate: new Date(0), endDate: new Date(WEEK), ...extra,
});

const rx = (lift: 'squat' | 'bench' | 'deadlift', phase: WeekBlock['phase']) =>
  program.prescribe({ block: block(phase), lift, trainingMax: TM[lift], unit: 'lb' }).groups;

describe('5/3/1 wave 1 loads (handoff table)', () => {
  // [top weight x reps, back-off weight x reps]
  const expected: Record<string, Record<'squat' | 'bench' | 'deadlift', [number, number, number, number]>> = {
    accumulation:    { squat: [180, 5, 160, 5],  bench: [110, 5, 100, 5],     deadlift: [190, 5, 170, 5] },
    intensification: { squat: [205, 3, 185, 3],  bench: [125, 3, 115, 3],     deadlift: [215, 3, 200, 3] },
    realization:     { squat: [215, 3, 180, 3],  bench: [132.5, 3, 110, 3],   deadlift: [230, 3, 190, 3] },
    deload:          { squat: [155, 3, 145, 3],  bench: [95, 3, 87.5, 3],     deadlift: [165, 3, 155, 3] },
  };

  for (const [phase, lifts] of Object.entries(expected)) {
    for (const lift of ['squat', 'bench', 'deadlift'] as const) {
      it(`${phase} ${lift}`, () => {
        const [topW, topR, boW, boR] = lifts[lift];
        const [top, backoff] = rx(lift, phase as WeekBlock['phase']);
        expect(top).toMatchObject({ kind: 'top', sets: 1, weight: topW, reps: topR });
        expect(backoff).toMatchObject({ kind: 'backoff', weight: boW, reps: boR });
      });
    }
  }

  it('only the realization top set is an AMRAP, with a 3-rep minimum', () => {
    for (const phase of ['accumulation', 'intensification', 'deload'] as const) {
      expect(rx('squat', phase)[0].isAmrap).toBe(false);
    }
    expect(rx('squat', 'realization')[0]).toMatchObject({ isAmrap: true, minReps: 3 });
    expect(rx('squat', 'realization')[1].isAmrap).toBe(false);
  });

  it('back-offs are a fixed number of sets for now, with no drop-off stop rule', () => {
    const counts = Object.fromEntries(Object.keys(WAVE).map(p => [p, rx('squat', p as WeekBlock['phase'])[1].sets]));
    expect(counts).toEqual({ accumulation: 3, intensification: 3, realization: 2, deload: 2 });
    expect(rx('squat', 'accumulation')[1].stopRule).toBe('fixed');
  });
});

describe('rounding', () => {
  it('uses 5 lb for squat and deadlift and 2.5 lb for bench and OHP', () => {
    expect(loadIncrement('squat', 'lb')).toBe(5);
    expect(loadIncrement('deadlift', 'lb')).toBe(5);
    expect(loadIncrement('bench', 'lb')).toBe(2.5);
    expect(loadIncrement('ohp', 'lb')).toBe(2.5);
  });

  it('halves each step in kg', () => {
    expect(loadIncrement('squat', 'kg')).toBe(2.5);
    expect(loadIncrement('bench', 'kg')).toBe(1.25);
  });

  it('rounds to the nearest step', () => {
    expect(roundLoad(162, 'squat', 'lb')).toBe(160);
    expect(roundLoad(197.6, 'deadlift', 'lb')).toBe(200);
    expect(roundLoad(88.5, 'bench', 'lb')).toBe(87.5);
    expect(roundLoad(110.625, 'bench', 'lb')).toBe(110);
  });

  it('every loaded weight is a multiple of its lift step across waves, lifts and units', () => {
    for (const unit of ['lb', 'kg'] as const) {
      for (const lift of ['squat', 'bench', 'deadlift', 'ohp'] as LiftId[]) {
        for (const phase of ['accumulation', 'intensification', 'realization', 'deload'] as const) {
          const groups = program.prescribe({ block: block(phase), lift, trainingMax: unit === 'kg' ? 110 : 243, unit }).groups;
          const step = loadIncrement(lift, unit);
          for (const g of groups) expect(Math.abs(g.weight / step - Math.round(g.weight / step))).toBeLessThan(1e-9);
        }
      }
    }
  });
});

describe('training max after the realization AMRAP (handoff table)', () => {
  const tm = (lift: 'squat' | 'bench' | 'deadlift', weight: number, reps: number, history?: SessionSummary[]) =>
    nextTrainingMax({ lift, currentTm: TM[lift], topSet: { weight, reps }, history, unit: 'lb' });

  it('squat 215 x 8: fixed increment is larger, TM 250', () => {
    expect(tm('squat', 215, 8)).toMatchObject({ newTm: 250, reason: 'increase' });
    expect(Math.round(0.9 * epley(215, 8))).toBe(245);
  });

  it('squat 215 x 3: minimum met, so the fixed increment applies (TM 250)', () => {
    expect(tm('squat', 215, 3)).toMatchObject({ newTm: 250, reason: 'increase' });
    expect(Math.round(0.9 * epley(215, 3))).toBe(213);
  });

  it('squat 215 x 2: minimum missed holds at 240', () => {
    expect(tm('squat', 215, 2)).toMatchObject({ newTm: 240, reason: 'hold' });
  });

  it('squat 215 x 2 with the second signal drops 5% to 230', () => {
    const drop = (reps: number): SessionSummary => ({
      phase: 'accumulation',
      mainSets: [{ weight: 180, reps: 5 }, { weight: 160, reps }],
    });
    expect(tm('squat', 215, 2, [drop(4), drop(3)])).toMatchObject({ newTm: 230, reason: 'decrease' });
  });

  it('bench 132.5 x 7: fixed increment is larger, TM 152.5', () => {
    expect(tm('bench', 132.5, 7)).toMatchObject({ newTm: 152.5, reason: 'increase' });
    expect(Math.round(0.9 * epley(132.5, 7))).toBe(147);
  });

  it('deadlift 230 x 11: e1RM is larger but the +5% cap holds it to 265', () => {
    expect(Math.round(0.9 * epley(230, 11))).toBe(283);
    expect(255 * 1.05).toBeCloseTo(267.75, 5);
    expect(tm('deadlift', 230, 11)).toMatchObject({ newTm: 265, reason: 'increase' });
  });

  it('a low-rep AMRAP that meets the minimum never lowers the TM, even with the second signal', () => {
    const drop: SessionSummary = { phase: 'intensification', mainSets: [{ weight: 205, reps: 3 }, { weight: 185, reps: 2 }] };
    const res = tm('squat', 215, 3, [drop, drop, drop]);
    expect(res.newTm).toBeGreaterThanOrEqual(240);
    expect(res.reason).toBe('increase');
  });

  it('never exceeds the cap or drops below the current TM when the minimum is met', () => {
    for (const lift of ['squat', 'bench', 'deadlift'] as const) {
      for (const reps of [3, 4, 5, 8, 12, 20]) {
        const res = tm(lift, TM[lift] * 0.9, reps);
        expect(res.newTm).toBeLessThanOrEqual(TM[lift] * 1.05);
        expect(res.newTm).toBeGreaterThanOrEqual(TM[lift]);
      }
    }
  });

  it('rounds a capped increase down to the plate step', () => {
    // 100 lb squat TM: +10 fixed would be 110, cap is 105.
    const res = nextTrainingMax({ lift: 'squat', currentTm: 100, topSet: { weight: 90, reps: 5 }, unit: 'lb' });
    expect(res.newTm).toBe(105);
    // 101 lb: cap 106.05 floors to 105.
    expect(nextTrainingMax({ lift: 'squat', currentTm: 101, topSet: { weight: 90, reps: 5 }, unit: 'lb' }).newTm).toBe(105);
  });

  it('fixed increments are +10 lb squat/deadlift, +5 lb bench/OHP, halved in kg', () => {
    expect(fixedIncrement('squat', 'lb')).toBe(10);
    expect(fixedIncrement('deadlift', 'lb')).toBe(10);
    expect(fixedIncrement('bench', 'lb')).toBe(5);
    expect(fixedIncrement('ohp', 'lb')).toBe(5);
    expect(fixedIncrement('squat', 'kg')).toBe(5);
    expect(fixedIncrement('bench', 'kg')).toBe(2.5);
  });
});

describe('second signal', () => {
  const session = (phase: SessionSummary['phase'], firstBackoffReps: number): SessionSummary => ({
    phase, mainSets: [{ weight: 200, reps: 5 }, { weight: 180, reps: firstBackoffReps }, { weight: 180, reps: 5 }],
  });

  it('needs the first back-off to fall short in at least 2 sessions', () => {
    expect(hasSecondSignal([session('accumulation', 4), session('intensification', 2)])).toBe(true);
    expect(hasSecondSignal([session('accumulation', 4), session('intensification', 3)])).toBe(false);
    expect(hasSecondSignal([session('accumulation', 5)])).toBe(false);
    expect(hasSecondSignal([])).toBe(false);
    expect(hasSecondSignal(undefined)).toBe(false);
  });

  it('compares against that week\'s back-off target (5s in accumulation, 3s after)', () => {
    expect(hasSecondSignal([session('accumulation', 4), session('accumulation', 4)])).toBe(true);
    expect(hasSecondSignal([session('intensification', 4), session('realization', 4)])).toBe(false);
  });

  it('ignores deload sessions and sessions with no back-off set', () => {
    expect(hasSecondSignal([session('deload', 0), session('deload', 0)])).toBe(false);
    const noBackoff: SessionSummary = { phase: 'accumulation', mainSets: [{ weight: 200, reps: 5 }] };
    expect(hasSecondSignal([noBackoff, noBackoff])).toBe(false);
  });
});

describe('5/3/1 schedule', () => {
  const start = new Date('2026-01-05T00:00:00.000Z');
  const meetIn = (weeks: number) => new Date(start.getTime() + weeks * WEEK + 3 * DAY);

  it('without a meet date repeats four-week waves with no peak block', () => {
    const s = program.buildSchedule({ startDate: start });
    expect(s.repeats).toBe(true);
    expect(s.peakWeekIndex).toBe(-1);
    expect(s.weeks.length % 4).toBe(0);
    expect(s.weeks.slice(0, 8).map(w => w.phase)).toEqual([
      'accumulation', 'intensification', 'realization', 'deload',
      'accumulation', 'intensification', 'realization', 'deload',
    ]);
    expect(s.weeks.some(w => w.phase === 'peaking' || w.phase === 'meet_week')).toBe(false);
    expect(s.weeks.every(w => w.wave === undefined)).toBe(true);
  });

  it('numbers weeks and cycles consecutively and dates them a week apart', () => {
    const s = program.buildSchedule({ startDate: start });
    s.weeks.forEach((w, i) => {
      expect(w.weekIndex).toBe(i);
      expect(w.cycleIndex).toBe(Math.floor(i / 4));
      expect(w.startDate.getTime()).toBe(start.getTime() + i * WEEK);
    });
  });

  it('with a meet date adds a peak block and a meet week after the waves', () => {
    const s = program.buildSchedule({ startDate: start, meetDate: meetIn(20) });
    expect(s.repeats).toBeUndefined();
    const phases = s.weeks.map(w => w.phase);
    expect(phases.filter(p => p === 'meet_week')).toHaveLength(1);
    expect(phases[phases.length - 1]).toBe('meet_week');
    const peaking = s.weeks.filter(w => w.phase === 'peaking');
    expect(peaking.length).toBeGreaterThanOrEqual(3);
    expect(peaking.map(w => w.peakWeek)).toEqual(peaking.map((_, i) => i + 1));
    expect(s.peakWeekIndex).toBe(s.weeks.findIndex(w => w.phase === 'peaking'));
    // Waves before the peak are whole four-week cycles.
    expect(s.peakWeekIndex % 4).toBe(0);
  });

  it('uses surplus weeks on the peak block, up to six weeks', () => {
    // 20 weeks: 20 - 3 peak - 1 meet = 16 -> 4 cycles, no surplus.
    expect(planPeakBlock(20, 4)).toMatchObject({ cycles: 4, peakWeeks: 3 });
    // 22 weeks: 18 -> 4 cycles, 2 surplus -> 5 peak weeks.
    expect(planPeakBlock(22, 4)).toMatchObject({ cycles: 4, peakWeeks: 5 });
    // 24 weeks: 20 -> 5 cycles, no surplus.
    expect(planPeakBlock(24, 4)).toMatchObject({ cycles: 5, peakWeeks: 3 });
  });

  it('with a meet date, the last scheduled week is the meet week, ending within a week of meet day', () => {
    for (const weeks of [9, 12, 16, 20, 23, 30, 40]) {
      const meet = meetIn(weeks);
      const s = program.buildSchedule({ startDate: start, meetDate: meet });
      const last = s.weeks[s.weeks.length - 1];
      expect(last.phase).toBe('meet_week');
      // Same whole-week arithmetic as Juggernaut: the meet week is the last full
      // week from the start date, so meet day falls within a week after it ends.
      expect(meet.getTime()).toBeGreaterThanOrEqual(last.startDate.getTime());
      expect(meet.getTime()).toBeLessThanOrEqual(last.endDate.getTime() + WEEK);
    }
  });

  it('with too little time before the meet, returns no weeks and says why', () => {
    const s = program.buildSchedule({ startDate: start, meetDate: meetIn(4) });
    expect(s.weeks).toEqual([]);
    expect(s.adjustments[0]).toMatch(/Not enough time/);
    expect(planPeakBlock(7, 4).cycles).toBe(0);
    expect(planPeakBlock(8, 4).cycles).toBe(1);
  });

  it('puts the peak and meet weeks in the cycle after the last wave', () => {
    const s = program.buildSchedule({ startDate: start, meetDate: meetIn(20) });
    const waves = s.weeks.filter(w => !['peaking', 'meet_week'].includes(w.phase));
    const lastWave = Math.max(...waves.map(w => w.cycleIndex!));
    expect(s.weeks.filter(w => w.phase === 'peaking').every(w => w.cycleIndex === lastWave + 1)).toBe(true);
  });
});

describe('5/3/1 peak and meet weeks', () => {
  it('uses the shared Juggernaut taper', () => {
    const groups = program.prescribe({
      block: block('peaking', { peakWeek: 3, totalPeakWeeks: 3 }), lift: 'squat', trainingMax: 240, unit: 'lb',
    }).groups;
    expect(groups[0]).toMatchObject({ kind: 'top', sets: 1, reps: 1 });
    expect(groups[0].weight).toBeGreaterThan(0);
  });

  it('meet week is one single at 55% of the TM', () => {
    expect(program.prescribe({ block: block('meet_week'), lift: 'squat', trainingMax: 240, unit: 'lb' }).groups[0])
      .toMatchObject({ sets: 1, reps: 1, weight: 130 });
  });
});

describe('5/3/1 program definition', () => {
  it('supports 3 and 4 days, with the same shape as the Juggernaut layouts', () => {
    expect(program.supportedDays).toEqual([3, 4]);
    expect(program.layout(3).days.map(d => d.dayId)).toEqual(['squat', 'bench', 'deadlift']);
    expect(program.layout(4).days.map(d => d.dayId)).toEqual(['squat', 'ohp', 'deadlift', 'bench']);
    expect(program.layout(3).days.find(d => d.dayId === 'deadlift')?.variationSlots).toEqual(['squat', 'bench']);
  });

  it('only updates the TM in the realization week', () => {
    for (const phase of ['accumulation', 'intensification', 'deload', 'peaking', 'meet_week'] as const) {
      expect(program.updateTrainingMax({
        lift: 'squat', currentTm: 240, block: block(phase), topSet: { weight: 215, reps: 8 }, unit: 'lb',
      })).toBeNull();
    }
    expect(program.updateTrainingMax({
      lift: 'squat', currentTm: 240, block: block('realization'), topSet: { weight: 215, reps: 8 }, unit: 'lb',
    })).toMatchObject({ newTm: 250 });
  });

  it('marks the deload to accumulation step as the wave boundary', () => {
    expect(program.isWaveBoundary('deload', 'accumulation')).toBe(true);
    expect(program.isWaveBoundary('deload', 'peaking')).toBe(false);
    expect(program.isWaveBoundary('realization', 'deload')).toBe(false);
  });
});
