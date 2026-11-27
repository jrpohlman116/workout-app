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
