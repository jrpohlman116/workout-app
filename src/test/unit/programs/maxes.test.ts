import { describe, it, expect } from 'vitest';
import { trainingMaxFor, hasTrainingMax, estimateMaxFromPerformance } from '../../../lib/programs/maxes';
import { calculateNewTrainingMax, calculatePeakingSets, getPeakingWeekNote } from '../../../lib/calculations';

describe('trainingMaxFor', () => {
  const base = { squat_max: 240, bench_max: 147.5, deadlift_max: 255 };

  it('reads the three main lifts directly', () => {
    expect(trainingMaxFor(base, 'squat')).toBe(240);
    expect(trainingMaxFor(base, 'bench')).toBe(147.5);
    expect(trainingMaxFor(base, 'deadlift')).toBe(255);
  });

  it('has no max for an accessory-only day or missing values', () => {
    expect(trainingMaxFor(base, null)).toBe(0);
    expect(trainingMaxFor({}, 'squat')).toBe(0);
    expect(trainingMaxFor({ squat_max: null }, 'squat')).toBe(0);
  });

  it('ignores the 135 placeholder: an OHP max needs its tested max too', () => {
    expect(trainingMaxFor({ ...base, ohp_max: 135 }, 'ohp')).toBe(0);
    expect(trainingMaxFor({ ...base, ohp_max: 135, ohp_tested_max: null }, 'ohp')).toBe(0);
    expect(trainingMaxFor({ ...base, ohp_max: 0, ohp_tested_max: 150 }, 'ohp')).toBe(0);
  });

  it('uses an OHP max saved as a pair, even one that equals the placeholder', () => {
    expect(trainingMaxFor({ ...base, ohp_max: 100, ohp_tested_max: 111 }, 'ohp')).toBe(100);
    expect(trainingMaxFor({ ...base, ohp_max: 135, ohp_tested_max: 150 }, 'ohp')).toBe(135);
    expect(hasTrainingMax({ ...base, ohp_max: 100, ohp_tested_max: 111 }, 'ohp')).toBe(true);
    expect(hasTrainingMax(base, 'ohp')).toBe(false);
  });
});

describe('estimateMaxFromPerformance', () => {
  it('estimates 1RM with Epley and sets the training max to 90%, rounded to the plate step', () => {
    // 95 x 5 -> 111 (Epley, rounded) -> 99.9 -> 100
    expect(estimateMaxFromPerformance(95, 5, 'lb')).toEqual({ estimated1RM: 111, trainingMax: 100 });
  });

  it('rounds to 2.5 for kg', () => {
    const est = estimateMaxFromPerformance(60, 5, 'kg')!;
    expect(est.trainingMax % 2.5).toBe(0);
    expect(est.trainingMax).toBeLessThan(est.estimated1RM);
  });

  it('treats a single as close to the 1RM', () => {
    expect(estimateMaxFromPerformance(135, 1, 'lb')).toMatchObject({ estimated1RM: 140 });
  });

  it('rejects input that cannot give a sensible max', () => {
    expect(estimateMaxFromPerformance(0, 5, 'lb')).toBeNull();
    expect(estimateMaxFromPerformance(-45, 5, 'lb')).toBeNull();
    expect(estimateMaxFromPerformance(95, 0, 'lb')).toBeNull();
    expect(estimateMaxFromPerformance(95, 13, 'lb')).toBeNull();
    expect(estimateMaxFromPerformance(NaN, 5, 'lb')).toBeNull();
    expect(estimateMaxFromPerformance(95, NaN, 'lb')).toBeNull();
  });
});

describe('overhead press in the shared engine', () => {
  it('moves the training max by half a plate step per rep, like bench', () => {
    for (const reps of [0, 3, 8, 12]) {
      expect(calculateNewTrainingMax(110, 8, reps, 'lb', 'ohp')).toBe(calculateNewTrainingMax(110, 8, reps, 'lb', 'bench'));
    }
    expect(calculateNewTrainingMax(110, 8, 12, 'lb', 'ohp')).toBeLessThan(calculateNewTrainingMax(110, 8, 12, 'lb', 'squat'));
  });

  it('peaks like bench', () => {
    for (let week = 1; week <= 4; week++) {
      expect(calculatePeakingSets(week, 4, 110, 'lb', 'ohp')).toEqual(calculatePeakingSets(week, 4, 110, 'lb', 'bench'));
      expect(getPeakingWeekNote(week, 4, 'ohp')).toBe(getPeakingWeekNote(week, 4, 'bench'));
    }
  });
});
