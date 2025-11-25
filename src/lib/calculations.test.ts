import { describe, it, expect } from 'vitest';
import {
  calculateOneRepMax,
  calculateTrainingMax,
  getCycleProgression,
  calculateWorkoutWeights,
  getWeekSubtext,
  calculateWilksScore,
  getGreeting,
} from './calculations';

describe('calculateOneRepMax', () => {
  it('should calculate 1RM using Epley formula', () => {
    expect(calculateOneRepMax(225, 5)).toBe(263);
    expect(calculateOneRepMax(315, 3)).toBe(347);
    expect(calculateOneRepMax(405, 1)).toBe(419);
  });

  it('should handle zero reps', () => {
    expect(calculateOneRepMax(225, 0)).toBe(225);
  });

  it('should round to nearest whole number', () => {
    expect(calculateOneRepMax(100, 10)).toBe(133);
  });
});

describe('calculateTrainingMax', () => {
  it('should calculate 90% of 1RM', () => {
    expect(calculateTrainingMax(300)).toBe(270);
    expect(calculateTrainingMax(225)).toBe(203);
    expect(calculateTrainingMax(405)).toBe(365);
  });

  it('should round to nearest whole number', () => {
    expect(calculateTrainingMax(315)).toBe(284);
  });
});

describe('getCycleProgression', () => {
  it('should add 5 lbs per cycle for upper body lifts', () => {
    expect(getCycleProgression(1, 'bench')).toBe(0);
    expect(getCycleProgression(2, 'bench')).toBe(5);
    expect(getCycleProgression(3, 'bench')).toBe(10);
    expect(getCycleProgression(1, 'ohp')).toBe(0);
    expect(getCycleProgression(2, 'ohp')).toBe(5);
  });

  it('should add 10 lbs per cycle for lower body lifts', () => {
    expect(getCycleProgression(1, 'squat')).toBe(0);
    expect(getCycleProgression(2, 'squat')).toBe(10);
    expect(getCycleProgression(3, 'squat')).toBe(20);
    expect(getCycleProgression(1, 'deadlift')).toBe(0);
    expect(getCycleProgression(2, 'deadlift')).toBe(10);
  });
});

describe('calculateWorkoutWeights', () => {
  const oneRepMax = 300;

  it('should calculate Week 1 weights (65%, 75%, 85%)', () => {
    const weights = calculateWorkoutWeights('squat', oneRepMax, 1, 1);
    expect(weights.set1).toBe(175);
    expect(weights.set2).toBe(205);
    expect(weights.set3).toBe(230);
  });

  it('should calculate Week 2 weights (70%, 80%, 90%)', () => {
    const weights = calculateWorkoutWeights('squat', oneRepMax, 1, 2);
    expect(weights.set1).toBe(190);
    expect(weights.set2).toBe(215);
    expect(weights.set3).toBe(245);
  });

  it('should calculate Week 3 weights (75%, 85%, 95%)', () => {
    const weights = calculateWorkoutWeights('squat', oneRepMax, 1, 3);
    expect(weights.set1).toBe(205);
    expect(weights.set2).toBe(230);
    expect(weights.set3).toBe(255);
  });

  it('should calculate Week 4 deload weights (40%, 50%, 60%)', () => {
    const weights = calculateWorkoutWeights('squat', oneRepMax, 1, 4);
    expect(weights.set1).toBe(110);
    expect(weights.set2).toBe(135);
    expect(weights.set3).toBe(160);
  });

  it('should round to nearest 5 lbs', () => {
    const weights = calculateWorkoutWeights('bench', 227, 1, 1);
    expect(weights.set1 % 5).toBe(0);
    expect(weights.set2 % 5).toBe(0);
    expect(weights.set3 % 5).toBe(0);
  });

  it('should add progression for subsequent cycles', () => {
    const cycle1 = calculateWorkoutWeights('squat', oneRepMax, 1, 1);
    const cycle2 = calculateWorkoutWeights('squat', oneRepMax, 2, 1);
    expect(cycle2.set1).toBeGreaterThan(cycle1.set1);
    expect(cycle2.set2).toBeGreaterThan(cycle1.set2);
    expect(cycle2.set3).toBeGreaterThan(cycle1.set3);
  });
});

describe('getWeekSubtext', () => {
  it('should return correct subtext for each week', () => {
    expect(getWeekSubtext(1)).toBe('5 reps');
    expect(getWeekSubtext(2)).toBe('3 reps');
    expect(getWeekSubtext(3)).toBe('5-3-1 reps');
    expect(getWeekSubtext(4)).toBe('deload');
  });

  it('should return deload for weeks beyond 4', () => {
    expect(getWeekSubtext(5)).toBe('deload');
    expect(getWeekSubtext(0)).toBe('deload');
  });
});

describe('calculateWilksScore', () => {
  it('should calculate Wilks score for male lifter', () => {
    const score = calculateWilksScore(315, 225, 405, 180, 'male');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(600);
  });

  it('should calculate Wilks score for female lifter', () => {
    const score = calculateWilksScore(225, 135, 315, 140, 'female');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(600);
  });

  it('should return 0 for zero bodyweight', () => {
    expect(calculateWilksScore(315, 225, 405, 0, 'male')).toBe(0);
  });

  it('should return 0 for negative bodyweight', () => {
    expect(calculateWilksScore(315, 225, 405, -10, 'male')).toBe(0);
  });

  it('should handle zero lifts', () => {
    const score = calculateWilksScore(0, 0, 0, 180, 'male');
    expect(score).toBe(0);
  });

  it('should use different coefficients for male vs female', () => {
    const maleScore = calculateWilksScore(315, 225, 405, 180, 'male');
    const femaleScore = calculateWilksScore(315, 225, 405, 180, 'female');
    expect(maleScore).not.toBe(femaleScore);
  });

  it('should round to 2 decimal places', () => {
    const score = calculateWilksScore(315, 225, 405, 180, 'male');
    expect(score).toBe(Math.round(score * 100) / 100);
  });
});

describe('getGreeting', () => {
  it('should return a greeting string', () => {
    const greeting = getGreeting();
    expect(['Good Morning', 'Good Afternoon', 'Good Evening']).toContain(greeting);
  });

  it('should return a non-empty string', () => {
    const greeting = getGreeting();
    expect(greeting).toBeTruthy();
    expect(typeof greeting).toBe('string');
  });
});
