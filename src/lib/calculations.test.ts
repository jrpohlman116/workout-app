import { describe, it, expect } from 'vitest';
import {
  calculateOneRepMax,
  calculateTrainingMax,
  getCycleProgression,
  calculateWorkoutWeights,
  getWeekSubtext,
  calculateWilksScore,
  getGreeting,
  calculateNewTrainingMax,
  calculateBackoffSets,
  buildWaveSchedule,
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

// ─── Juggernaut Method ────────────────────────────────────────────────────────

describe('calculateNewTrainingMax', () => {
  it('should equal calculateTrainingMax(calculateOneRepMax(weight, reps))', () => {
    expect(calculateNewTrainingMax(315, 5)).toBe(
      calculateTrainingMax(calculateOneRepMax(315, 5))
    );
  });

  it('should produce a higher TM when more reps are hit', () => {
    const tm8 = calculateNewTrainingMax(225, 8);
    const tm12 = calculateNewTrainingMax(225, 12);
    expect(tm12).toBeGreaterThan(tm8);
  });

  it('should produce a higher TM when heavier weight is used', () => {
    const tmLight = calculateNewTrainingMax(200, 5);
    const tmHeavy = calculateNewTrainingMax(250, 5);
    expect(tmHeavy).toBeGreaterThan(tmLight);
  });
});

describe('calculateBackoffSets', () => {
  it('RPE ≤7: 10% drop, 3 sets, 5 reps', () => {
    const result = calculateBackoffSets(300, 7);
    expect(result.sets).toBe(3);
    expect(result.reps).toBe(5);
    expect(result.weight).toBe(270); // 300 * 0.90 = 270
  });

  it('RPE 8: 15% drop, 3 sets, 3 reps', () => {
    const result = calculateBackoffSets(300, 8);
    expect(result.sets).toBe(3);
    expect(result.reps).toBe(3);
    expect(result.weight).toBe(255); // 300 * 0.85 = 255
  });

  it('RPE 9: 20% drop, 2 sets, 3 reps', () => {
    const result = calculateBackoffSets(300, 9);
    expect(result.sets).toBe(2);
    expect(result.reps).toBe(3);
    expect(result.weight).toBe(240); // 300 * 0.80 = 240
  });

  it('RPE 10: 25% drop, 2 sets, 3 reps', () => {
    const result = calculateBackoffSets(300, 10);
    expect(result.sets).toBe(2);
    expect(result.reps).toBe(3);
    expect(result.weight).toBe(225); // 300 * 0.75 = 225
  });

  it('should treat RPE 6 same as RPE ≤7', () => {
    const result = calculateBackoffSets(300, 6);
    expect(result.sets).toBe(3);
    expect(result.reps).toBe(5);
  });

  it('should round weight to nearest 5 lb', () => {
    const result = calculateBackoffSets(275, 7); // 275 * 0.90 = 247.5 → rounds to 250
    expect(result.weight % 5).toBe(0);
    expect(result.weight).toBe(250);
  });

  it('should round weight to nearest 2.5 kg', () => {
    const result = calculateBackoffSets(100, 7, 'kg'); // 100 * 0.90 = 90 → 90
    expect(result.weight % 2.5).toBe(0);
    expect(result.weight).toBe(90);
  });
});

describe('buildWaveSchedule', () => {
  const monday = (weeksFromNow: number) => {
    const d = new Date('2026-05-11');
    d.setDate(d.getDate() + weeksFromNow * 7);
    return d;
  };

  const start = monday(0);

  it('16-week timeline: runs all 4 waves at standard length', () => {
    const schedule = buildWaveSchedule(start, monday(16));
    expect(schedule.totalWeeks).toBe(16);
    expect(schedule.skippedWaves).toHaveLength(0);
    expect(schedule.adjustments).toHaveLength(0);

    const waves = [...new Set(schedule.weeks.map(w => w.wave))];
    expect(waves).toEqual([10, 8, 5, 3]);
  });

  it('each wave has all 4 phases in a standard schedule', () => {
    const schedule = buildWaveSchedule(start, monday(16));
    for (const wave of [10, 8, 5, 3] as const) {
      const phases = schedule.weeks.filter(w => w.wave === wave).map(w => w.phase);
      expect(phases).toContain('accumulation');
      expect(phases).toContain('intensification');
      expect(phases).toContain('realization');
      expect(phases).toContain('deload');
    }
  });

  it('deload is always present in every wave regardless of compression', () => {
    const schedule = buildWaveSchedule(start, monday(13));
    for (const wave of [...new Set(schedule.weeks.map(w => w.wave))]) {
      const phases = schedule.weeks.filter(w => w.wave === wave).map(w => w.phase);
      expect(phases).toContain('deload');
    }
  });

  it('12-week timeline: all 4 waves compressed to 3 weeks each', () => {
    const schedule = buildWaveSchedule(start, monday(12));
    expect(schedule.totalWeeks).toBe(12);
    expect(schedule.skippedWaves).toHaveLength(0);

    for (const wave of [10, 8, 5, 3] as const) {
      const waveWeeks = schedule.weeks.filter(w => w.wave === wave);
      expect(waveWeeks).toHaveLength(3);
      const phases = waveWeeks.map(w => w.phase);
      expect(phases).not.toContain('intensification');
    }
  });

  it('9-week timeline: skips 10-rep wave, runs 8/5/3', () => {
    const schedule = buildWaveSchedule(start, monday(9));
    expect(schedule.skippedWaves).toContain(10);
    const waves = [...new Set(schedule.weeks.map(w => w.wave))];
    expect(waves).not.toContain(10);
    expect(waves).toContain(8);
    expect(waves).toContain(5);
    expect(waves).toContain(3);
  });

  it('6-week timeline: skips 10 and 8, runs 5/3', () => {
    const schedule = buildWaveSchedule(start, monday(6));
    expect(schedule.skippedWaves).toContain(10);
    expect(schedule.skippedWaves).toContain(8);
    const waves = [...new Set(schedule.weeks.map(w => w.wave))];
    expect(waves).not.toContain(10);
    expect(waves).not.toContain(8);
    expect(waves).toContain(5);
    expect(waves).toContain(3);
  });

  it('3-week timeline: only 3-rep wave (compressed)', () => {
    const schedule = buildWaveSchedule(start, monday(3));
    const waves = [...new Set(schedule.weeks.map(w => w.wave))];
    expect(waves).toEqual([3]);
    expect(schedule.totalWeeks).toBe(3);
  });

  it('< 3-week timeline: returns empty schedule', () => {
    const schedule = buildWaveSchedule(start, monday(2));
    expect(schedule.weeks).toHaveLength(0);
    expect(schedule.totalWeeks).toBe(0);
    expect(schedule.peakWeekIndex).toBe(-1);
  });

  it('20-week timeline: elongates early waves to 5 weeks', () => {
    const schedule = buildWaveSchedule(start, monday(20));
    expect(schedule.totalWeeks).toBe(20);
    const tenWave = schedule.weeks.filter(w => w.wave === 10);
    expect(tenWave).toHaveLength(5);
  });

  it('peak week is the 3-rep realization week', () => {
    const schedule = buildWaveSchedule(start, monday(16));
    const peakWeek = schedule.weeks[schedule.peakWeekIndex];
    expect(peakWeek.wave).toBe(3);
    expect(peakWeek.phase).toBe('realization');
  });

  it('peak week is the last week before the deload in a standard schedule', () => {
    const schedule = buildWaveSchedule(start, monday(16));
    const peakWeek = schedule.weeks[schedule.peakWeekIndex];
    const weekAfterPeak = schedule.weeks[schedule.peakWeekIndex + 1];
    expect(weekAfterPeak.phase).toBe('deload');
  });

  it('records adjustments in plain English when waves are skipped or resized', () => {
    const schedule = buildWaveSchedule(start, monday(9));
    expect(schedule.adjustments.length).toBeGreaterThan(0);
    expect(typeof schedule.adjustments[0]).toBe('string');
  });

  it('week dates are sequential with no gaps', () => {
    const schedule = buildWaveSchedule(start, monday(16));
    for (let i = 1; i < schedule.weeks.length; i++) {
      const prev = schedule.weeks[i - 1].endDate.getTime();
      const curr = schedule.weeks[i].startDate.getTime();
      expect(curr - prev).toBe(1); // endDate + 1ms = next startDate
    }
  });
});
