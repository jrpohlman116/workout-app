import { describe, it, expect } from 'vitest';
import { floorLoad, getRoundingIncrement, loadIncrement, roundLoad } from '../../../lib/programs/shared/rounding';
import { estimateMaxFromPerformance } from '../../../lib/programs/maxes';
import { calculatePeakingSets } from '../../../lib/programs/shared/peaking';
import { tmChangeArgs } from '../../../lib/programs/tmChanges';

describe('one rounding helper', () => {
  it('uses the full step for squat and deadlift and half for bench and overhead press', () => {
    expect([loadIncrement('squat', 'lb'), loadIncrement('deadlift', 'lb'), loadIncrement('bench', 'lb'), loadIncrement('ohp', 'lb')])
      .toEqual([5, 5, 2.5, 2.5]);
    expect([loadIncrement('squat', 'kg'), loadIncrement('bench', 'kg')]).toEqual([2.5, 1.25]);
  });

  it('getRoundingIncrement is the full step unless given a lift', () => {
    expect(getRoundingIncrement('lb')).toBe(5);
    expect(getRoundingIncrement('kg')).toBe(2.5);
    expect(getRoundingIncrement('lb', 'bench')).toBe(2.5);
  });

  it('rounds half up, without float noise', () => {
    expect(roundLoad(187.5, 'squat', 'lb')).toBe(190);
    expect(roundLoad(125.375, 'bench', 'lb')).toBe(125);
    expect(roundLoad(148.5, 'bench', 'lb')).toBe(147.5);
    expect(floorLoad(252, 'squat', 'lb')).toBe(250);
  });

  it('the max estimate and the peak block round per lift', () => {
    // 95 x 5 -> e1RM 111, 90% = 99.9
    expect(estimateMaxFromPerformance(95, 5, 'lb', 'ohp')?.trainingMax).toBe(100);
    // 100 x 6 -> 120 e1RM, 90% = 108 -> 107.5 on the half step, 110 on the full
    expect(estimateMaxFromPerformance(100, 6, 'lb', 'ohp')?.trainingMax).toBe(107.5);
    expect(estimateMaxFromPerformance(100, 6, 'lb', 'squat')?.trainingMax).toBe(110);
    // Bench 1 week out of 6: 97% of 147.5 = 143.1 -> 142.5
    expect(calculatePeakingSets(6, 6, 147.5, 'lb', 'bench').weight).toBe(142.5);
    expect(calculatePeakingSets(6, 6, 147.5, 'lb', 'squat').weight).toBe(125);
  });
});

describe('training max change record', () => {
  it('carries the AMRAP, its e1RM and the wave', () => {
    expect(tmChangeArgs({
      lift: 'squat',
      update: { newTm: 250, reason: 'increase', explanation: 'x' },
      topSet: { weight: 215, reps: 8 },
      cycleIndex: 0,
    })).toEqual({
      p_lift: 'squat', p_new_tm: 250, p_reason: 'increase', p_amrap_weight: 215, p_amrap_reps: 8,
      p_e1rm: 272.3, p_explanation: 'x', p_cycle_index: 0,
    });
  });
});

describe('rounding to the lifter\'s plates', () => {
  const HANDOFF_PLATES = [45, 35, 25, 10, 5, 2.5];
  const WITH_CHANGE = [45, 25, 10, 5, 2.5, 1.25];

  it('never rounds finer than two of the smallest plate', () => {
    expect(loadIncrement('bench', 'lb', HANDOFF_PLATES)).toBe(5);
    expect(loadIncrement('bench', 'lb', WITH_CHANGE)).toBe(2.5);
    expect(loadIncrement('squat', 'lb', WITH_CHANGE)).toBe(5);
    expect(loadIncrement('bench', 'lb', [])).toBe(2.5);
    expect(loadIncrement('bench', 'kg', [25, 20, 10, 5, 2.5, 1.25])).toBe(2.5);
    expect(loadIncrement('bench', 'kg', [25, 0.5])).toBe(1.25);
  });

  it('bench TM 147.5: weeks 1-2 match the handoff, week 3 lands on a loadable 135 without 1.25s', async () => {
    const { getProgram } = await import('../../../lib/programs/registry');
    const program = getProgram('five_three_one');
    const rx = (phase: 'accumulation' | 'intensification' | 'realization', plates: number[]) =>
      program.prescribe({ block: { phase, weekIndex: 0, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) }, lift: 'bench', trainingMax: 147.5, unit: 'lb', plates })
        .groups.map(g => g.weight);
    expect(rx('accumulation', HANDOFF_PLATES)).toEqual([110, 100]);
    expect(rx('intensification', HANDOFF_PLATES)).toEqual([125, 115]);
    expect(rx('realization', HANDOFF_PLATES)).toEqual([135, 110]);
    expect(rx('realization', WITH_CHANGE)).toEqual([132.5, 110]);
  });

  it('the peak block rounds to the plates too', () => {
    expect(calculatePeakingSets(6, 6, 147.5, 'lb', 'bench', [45, 25, 10, 5, 2.5]).weight).toBe(145);
    expect(calculatePeakingSets(6, 6, 147.5, 'lb', 'bench', [45, 1.25]).weight).toBe(142.5);
  });
});
