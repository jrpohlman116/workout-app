import { describe, it, expect } from 'vitest';
import {
  calculateOneRepMax,
  calculateTrainingMax,
  calculateWilksScore,
  getGreeting,
  calculateNewTrainingMax,
  calculateBackoffSets,
  buildWaveSchedule,
  calculateJuggernautSets,
  calculatePeakingSets,
  calculatePlateBreakdown,
  formatPlateBreakdown,
} from '../../lib/calculations';

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
  it('keeps TM unchanged when actual reps equal the standard target', () => {
    expect(calculateNewTrainingMax(270, 10, 10, 'lb')).toBe(270);
  });

  it('adds 5 lb per rep over the standard target', () => {
    expect(calculateNewTrainingMax(270, 10, 15, 'lb')).toBe(295);
  });

  it('subtracts 5 lb per rep under the standard target', () => {
    expect(calculateNewTrainingMax(270, 10, 8, 'lb')).toBe(260);
  });

  it('adds 2.5 kg per rep over the standard target in kg', () => {
    expect(calculateNewTrainingMax(120, 10, 13, 'kg')).toBe(127.5);
  });

  it('rounds up to the nearest plate increment', () => {
    expect(calculateNewTrainingMax(272, 10, 10, 'lb')).toBe(275);
  });

  it('should produce a higher TM when more reps are hit', () => {
    const tm8 = calculateNewTrainingMax(225, 10, 8, 'lb');
    const tm12 = calculateNewTrainingMax(225, 10, 12, 'lb');
    expect(tm12).toBeGreaterThan(tm8);
  });

  it('defaults to lb increments when no unit is given', () => {
    expect(calculateNewTrainingMax(270, 10, 12)).toBe(280);
  });

  it('uses half the per-rep bump for bench, rounded up to the nearest 5 lb', () => {
    // 145 TM, 8-rep target, 15 actual reps → 145 + 7×2.5 = 162.5 → ceil to 165
    expect(calculateNewTrainingMax(145, 8, 15, 'lb', 'bench')).toBe(165);
  });

  it('squat and deadlift use the full per-rep bump, not the bench rate', () => {
    expect(calculateNewTrainingMax(145, 8, 15, 'lb', 'squat')).toBe(180);
    expect(calculateNewTrainingMax(145, 8, 15, 'lb', 'deadlift')).toBe(180);
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

  // Note: buildWaveSchedule always reserves 4 weeks at the end (3 peaking + 1 meet week).
  // A 20-week total timeline = 16 wave weeks + 4 reserved.

  it('20-week timeline: runs all 4 waves at standard length (16 wave weeks + 4 peaking/meet)', () => {
    const schedule = buildWaveSchedule(start, monday(20));
    expect(schedule.totalWeeks).toBe(20);
    expect(schedule.skippedWaves).toHaveLength(0);
    expect(schedule.adjustments).toHaveLength(0);

    const trainingWaves = [...new Set(schedule.weeks.filter(w => w.phase !== 'peaking' && w.phase !== 'meet_week').map(w => w.wave))];
    expect(trainingWaves).toEqual([10, 8, 5, 3]);
  });

  it('each training wave has all 4 standard phases', () => {
    // 20-week total = 16 wave weeks = 4 waves × 4 weeks each
    const schedule = buildWaveSchedule(start, monday(20));
    for (const wave of [10, 8, 5, 3] as const) {
      const phases = schedule.weeks
        .filter(w => w.wave === wave && w.phase !== 'peaking' && w.phase !== 'meet_week')
        .map(w => w.phase);
      expect(phases).toContain('accumulation');
      expect(phases).toContain('intensification');
      expect(phases).toContain('realization');
      expect(phases).toContain('deload');
    }
  });

  it('deload is always present in every training wave regardless of compression', () => {
    // 17-week total = 13 wave weeks — enough for compressed 4 waves (3+3+3+4)
    const schedule = buildWaveSchedule(start, monday(17));
    const trainingWaves = [...new Set(
      schedule.weeks
        .filter(w => w.phase !== 'peaking' && w.phase !== 'meet_week')
        .map(w => w.wave)
    )];
    for (const wave of trainingWaves) {
      const phases = schedule.weeks
        .filter(w => w.wave === wave && w.phase !== 'peaking' && w.phase !== 'meet_week')
        .map(w => w.phase);
      expect(phases).toContain('deload');
    }
  });

  it('16-week timeline: all 4 waves compressed to 3 weeks each (12 wave + 4 peaking/meet)', () => {
    const schedule = buildWaveSchedule(start, monday(16));
    expect(schedule.totalWeeks).toBe(16);
    expect(schedule.skippedWaves).toHaveLength(0);

    for (const wave of [10, 8, 5, 3] as const) {
      const waveWeeks = schedule.weeks.filter(w => w.wave === wave && w.phase !== 'peaking' && w.phase !== 'meet_week');
      expect(waveWeeks).toHaveLength(3);
      const phases = waveWeeks.map(w => w.phase);
      expect(phases).not.toContain('intensification');
    }
  });

  it('13-week timeline: skips 10-rep wave, runs 8/5/3', () => {
    const schedule = buildWaveSchedule(start, monday(13));
    expect(schedule.skippedWaves).toContain(10);
    const trainingWaves = [...new Set(schedule.weeks.filter(w => w.phase !== 'peaking' && w.phase !== 'meet_week').map(w => w.wave))];
    expect(trainingWaves).not.toContain(10);
    expect(trainingWaves).toContain(8);
    expect(trainingWaves).toContain(5);
    expect(trainingWaves).toContain(3);
  });

  it('10-week timeline: skips 10 and 8, runs 5/3', () => {
    const schedule = buildWaveSchedule(start, monday(10));
    expect(schedule.skippedWaves).toContain(10);
    expect(schedule.skippedWaves).toContain(8);
    const trainingWaves = [...new Set(schedule.weeks.filter(w => w.phase !== 'peaking' && w.phase !== 'meet_week').map(w => w.wave))];
    expect(trainingWaves).not.toContain(10);
    expect(trainingWaves).not.toContain(8);
    expect(trainingWaves).toContain(5);
    expect(trainingWaves).toContain(3);
  });

  it('7-week timeline: only 3-rep wave (compressed) + 4 peaking/meet weeks', () => {
    const schedule = buildWaveSchedule(start, monday(7));
    const trainingWaves = [...new Set(schedule.weeks.filter(w => w.phase !== 'peaking' && w.phase !== 'meet_week').map(w => w.wave))];
    expect(trainingWaves).toEqual([3]);
    expect(schedule.totalWeeks).toBe(7);
  });

  it('< 7-week timeline with no room for training waves: returns empty schedule', () => {
    const schedule = buildWaveSchedule(start, monday(6));
    expect(schedule.weeks).toHaveLength(0);
    expect(schedule.totalWeeks).toBe(0);
    expect(schedule.peakWeekIndex).toBe(-1);
  });

  it('24-week timeline: surplus weeks extend peak block (not waves); 6 peak weeks + 1 off-program week', () => {
    const schedule = buildWaveSchedule(start, monday(24));
    expect(schedule.totalWeeks).toBe(24);

    // Training waves stay at standard 4-week length
    const tenWave = schedule.weeks.filter(w => w.wave === 10 && w.phase !== 'peaking' && w.phase !== 'meet_week');
    expect(tenWave).toHaveLength(4);

    // Peak block is extended to 6 weeks (the maximum)
    const peaking = schedule.weeks.filter(w => w.phase === 'peaking');
    expect(peaking).toHaveLength(6);
    expect(peaking[0].totalPeakWeeks).toBe(6);
  });

  it('22-week timeline: extends peak to 5 weeks', () => {
    const schedule = buildWaveSchedule(start, monday(22));
    const peaking = schedule.weeks.filter(w => w.phase === 'peaking');
    expect(peaking).toHaveLength(5);
    expect(peaking[0].totalPeakWeeks).toBe(5);
    expect(schedule.adjustments.some(a => a.includes('5 weeks'))).toBe(true);
  });

  it('23-week timeline: extends peak to 6 weeks', () => {
    const schedule = buildWaveSchedule(start, monday(23));
    const peaking = schedule.weeks.filter(w => w.phase === 'peaking');
    expect(peaking).toHaveLength(6);
    expect(peaking[0].totalPeakWeeks).toBe(6);
  });

  it('peaking block starts right after training waves and has 3 weeks on a 20-week timeline', () => {
    const schedule = buildWaveSchedule(start, monday(20));
    const peakingWeeks = schedule.weeks.filter(w => w.phase === 'peaking');
    expect(peakingWeeks).toHaveLength(3);
    expect(peakingWeeks[0].peakWeek).toBe(1);
    expect(peakingWeeks[1].peakWeek).toBe(2);
    expect(peakingWeeks[2].peakWeek).toBe(3);
    expect(peakingWeeks[0].totalPeakWeeks).toBe(3);
  });

  it('peakWeekIndex points to the first peaking week', () => {
    const schedule = buildWaveSchedule(start, monday(20));
    const peakBlock = schedule.weeks[schedule.peakWeekIndex];
    expect(peakBlock.phase).toBe('peaking');
    expect(peakBlock.peakWeek).toBe(1);
  });

  it('meet week is the last week', () => {
    const schedule = buildWaveSchedule(start, monday(20));
    const last = schedule.weeks[schedule.weeks.length - 1];
    expect(last.phase).toBe('meet_week');
  });

  it('records adjustments in plain English when waves are skipped or resized', () => {
    const schedule = buildWaveSchedule(start, monday(13));
    expect(schedule.adjustments.length).toBeGreaterThan(0);
    expect(typeof schedule.adjustments[0]).toBe('string');
  });

  it('week dates are sequential with no gaps', () => {
    const schedule = buildWaveSchedule(start, monday(20));
    for (let i = 1; i < schedule.weeks.length; i++) {
      const prev = schedule.weeks[i - 1].endDate.getTime();
      const curr = schedule.weeks[i].startDate.getTime();
      expect(curr - prev).toBe(1); // endDate + 1ms = next startDate
    }
  });
});

// ─── calculateJuggernautSets ──────────────────────────────────────────────────
//
// Lifter profile used throughout: squat 1RM = 295 lb → TM = 266 lb
// Each wave uses the TM produced by the previous wave's realization AMAP set.

describe('calculateJuggernautSets', () => {
  // TM derived from a 295 lb 1RM
  const TM_266 = calculateTrainingMax(295); // 266

  describe('10-rep wave', () => {
    it('accumulation: 5 sets × 10 reps @ 60% TM', () => {
      const cfg = calculateJuggernautSets(10, 'accumulation', TM_266);
      expect(cfg.numSets).toBe(5);
      expect(cfg.reps).toBe(10);
      expect(cfg.weight).toBe(160);
      expect(cfg.isAmap).toBe(false);
    });

    it('intensification: 4 sets × 10 reps @ 65% TM', () => {
      const cfg = calculateJuggernautSets(10, 'intensification', TM_266);
      expect(cfg.numSets).toBe(4);
      expect(cfg.reps).toBe(10);
      expect(cfg.weight).toBe(175);
      expect(cfg.isAmap).toBe(false);
    });

    it('realization: 1 AMAP set × 10+ reps @ 75% TM', () => {
      const cfg = calculateJuggernautSets(10, 'realization', TM_266);
      expect(cfg.numSets).toBe(1);
      expect(cfg.reps).toBe(10);
      expect(cfg.weight).toBe(200);
      expect(cfg.isAmap).toBe(true);
    });

    it('deload: 3 sets × 10 reps @ 45% TM', () => {
      const cfg = calculateJuggernautSets(10, 'deload', TM_266);
      expect(cfg.numSets).toBe(3);
      expect(cfg.reps).toBe(10);
      expect(cfg.weight).toBe(120);
      expect(cfg.isAmap).toBe(false);
    });
  });

  describe('8-rep wave (TM = 270, an arbitrary post-realization value)', () => {
    const TM_270 = 270;

    it('accumulation: 5 sets × 8 reps @ 65% TM', () => {
      const cfg = calculateJuggernautSets(8, 'accumulation', TM_270);
      expect(cfg.numSets).toBe(5);
      expect(cfg.reps).toBe(8);
      expect(cfg.weight).toBe(175);
    });

    it('intensification: 4 sets × 8 reps @ 70% TM', () => {
      const cfg = calculateJuggernautSets(8, 'intensification', TM_270);
      expect(cfg.numSets).toBe(4);
      expect(cfg.reps).toBe(8);
      expect(cfg.weight).toBe(190);
    });

    it('realization: 1 AMAP set × 8+ reps @ 80% TM', () => {
      const cfg = calculateJuggernautSets(8, 'realization', TM_270);
      expect(cfg.numSets).toBe(1);
      expect(cfg.reps).toBe(8);
      expect(cfg.weight).toBe(215);
      expect(cfg.isAmap).toBe(true);
    });

    it('deload: 3 sets × 10 reps @ 50% TM', () => {
      const cfg = calculateJuggernautSets(8, 'deload', TM_270);
      expect(cfg.numSets).toBe(3);
      expect(cfg.reps).toBe(10);
      expect(cfg.weight).toBe(135);
    });
  });

  it('weight rounds to nearest 5 lb', () => {
    const oddTM = 271; // 271 * 0.60 = 162.6 → rounds to 165
    const cfg = calculateJuggernautSets(10, 'accumulation', oddTM);
    expect(cfg.weight % 5).toBe(0);
  });

  it('weight rounds to nearest 2.5 kg', () => {
    const cfg = calculateJuggernautSets(10, 'accumulation', 100, 'kg');
    expect(cfg.weight % 2.5).toBe(0);
  });

  it('realization weight is always heavier than intensification', () => {
    for (const wave of [10, 8, 5, 3] as const) {
      const int = calculateJuggernautSets(wave, 'intensification', TM_266);
      const real = calculateJuggernautSets(wave, 'realization', TM_266);
      expect(real.weight).toBeGreaterThan(int.weight);
    }
  });

  it('deload weight is lighter than accumulation weight in every wave', () => {
    for (const wave of [10, 8, 5, 3] as const) {
      const acc = calculateJuggernautSets(wave, 'accumulation', TM_266);
      const deload = calculateJuggernautSets(wave, 'deload', TM_266);
      expect(deload.weight).toBeLessThan(acc.weight);
    }
  });
});

// ─── Juggernaut integration: full program cycle ───────────────────────────────
//
// Simulates a lifter completing all 4 waves, beating each realization week's
// AMAP target (= the wave number) by 2 reps every time. After each realization
// week the TM is recalculated (+5 lb per rep over target) and fed into the
// next wave.
//
// Starting squat 1RM: 295 lb → TM 266
// AMAP reps hit: 10-rep=12, 8-rep=10, 5-rep=7, 3-rep=5 (standard + 2 each wave)

describe('Juggernaut integration: full 4-wave program cycle', () => {
  const STARTING_1RM = 295;
  const AMAP_REPS: Record<number, number> = { 10: 12, 8: 10, 5: 7, 3: 5 };

  function runFullCycle() {
    let tm = calculateTrainingMax(STARTING_1RM);
    const history: { wave: number; tm: number; realization: number; newTm: number }[] = [];

    for (const wave of [10, 8, 5, 3] as const) {
      const real = calculateJuggernautSets(wave, 'realization', tm);
      const newTm = calculateNewTrainingMax(tm, wave, AMAP_REPS[wave], 'lb');
      history.push({ wave, tm, realization: real.weight, newTm });
      tm = newTm;
    }

    return history;
  }

  it('TM increases after each wave when lifter exceeds minimum reps', () => {
    const history = runFullCycle();
    for (const entry of history) {
      expect(entry.newTm).toBeGreaterThan(entry.tm);
    }
  });

  it('realization weight increases across waves as TM grows', () => {
    const history = runFullCycle();
    // Each wave's realization weight should be heavier than the previous wave's
    for (let i = 1; i < history.length; i++) {
      expect(history[i].realization).toBeGreaterThan(history[i - 1].realization);
    }
  });

  it('accumulation → intensification → realization weights increase within each wave', () => {
    let tm = calculateTrainingMax(STARTING_1RM);
    for (const wave of [10, 8, 5, 3] as const) {
      const acc = calculateJuggernautSets(wave, 'accumulation', tm);
      const int = calculateJuggernautSets(wave, 'intensification', tm);
      const real = calculateJuggernautSets(wave, 'realization', tm);
      expect(int.weight).toBeGreaterThan(acc.weight);
      expect(real.weight).toBeGreaterThan(int.weight);
      tm = calculateNewTrainingMax(tm, wave, AMAP_REPS[wave], 'lb');
    }
  });

  it('hitting minimum reps improves TM less than beating them significantly', () => {
    const tm = calculateTrainingMax(STARTING_1RM); // 266
    const tmBarely = calculateNewTrainingMax(tm, 10, 10, 'lb'); // exactly standard
    const tmStrong = calculateNewTrainingMax(tm, 10, 20, 'lb'); // 10 extra reps
    expect(tmStrong).toBeGreaterThan(tmBarely);
  });

  it('full cycle: squat TM grows from 266 to 310 with good AMAP performance', () => {
    // 10-rep: TM 266, beat standard (10) by 2 reps → TM 280
    const tm1 = calculateNewTrainingMax(266, 10, 12, 'lb');
    expect(tm1).toBe(280);

    // 8-rep: TM 280, beat standard (8) by 2 reps → TM 290
    const real8 = calculateJuggernautSets(8, 'realization', tm1);
    const tm2 = calculateNewTrainingMax(tm1, 8, 10, 'lb');
    expect(real8.weight).toBe(225);
    expect(tm2).toBe(290);

    // 5-rep: TM 290, beat standard (5) by 2 reps → TM 300
    const real5 = calculateJuggernautSets(5, 'realization', tm2);
    const tm3 = calculateNewTrainingMax(tm2, 5, 7, 'lb');
    expect(real5.weight).toBe(245);
    expect(tm3).toBe(300);

    // 3-rep: TM 300, beat standard (3) by 2 reps → TM 310
    const real3 = calculateJuggernautSets(3, 'realization', tm3);
    const tm4 = calculateNewTrainingMax(tm3, 3, 5, 'lb');
    expect(real3.weight).toBe(270);
    expect(tm4).toBe(310);

    // End TM (310) is higher than start TM (266)
    expect(tm4).toBeGreaterThan(calculateTrainingMax(STARTING_1RM));
  });
});

describe('calculatePeakingSets', () => {
  const TM = 300;

  it('follows the weeks-from-meet percentage ramp for squat/deadlift (6-week peak)', () => {
    // peakWeek counts forward, weeksFromMeet = total - peakWeek + 1
    expect(calculatePeakingSets(1, 6, TM).weight).toBe(255); // 6 out: 85%
    expect(calculatePeakingSets(2, 6, TM).weight).toBe(265); // 5 out: 89% -> 267 -> 265
    expect(calculatePeakingSets(3, 6, TM).weight).toBe(280); // 4 out: 93% -> 279 -> 280
    expect(calculatePeakingSets(4, 6, TM).weight).toBe(290); // 3 out: 97% -> 291 -> 290
    expect(calculatePeakingSets(5, 6, TM).weight).toBe(305); // 2 out: 102% -> 306 -> 305
    expect(calculatePeakingSets(6, 6, TM).weight).toBe(255); // 1 out: opener-weight 85%
  });

  it('always prescribes a single top set', () => {
    for (let week = 1; week <= 6; week++) {
      const cfg = calculatePeakingSets(week, 6, TM);
      expect(cfg.numSets).toBe(1);
      expect(cfg.reps).toBe(1);
      expect(cfg.isAmap).toBe(false);
    }
  });

  it('peaks squat/deadlift at 2 weeks out and bench at 1 week out', () => {
    // 2 weeks out: squat above TM, bench at TM
    expect(calculatePeakingSets(5, 6, TM, 'lb', 'squat').weight).toBe(305);
    expect(calculatePeakingSets(5, 6, TM, 'lb', 'deadlift').weight).toBe(305);
    expect(calculatePeakingSets(5, 6, TM, 'lb', 'bench').weight).toBe(300);
    // 1 week out: squat drops to opener weight, bench takes its last heavy single
    expect(calculatePeakingSets(6, 6, TM, 'lb', 'squat').weight).toBe(255);
    expect(calculatePeakingSets(6, 6, TM, 'lb', 'bench').weight).toBe(290); // 97%
  });

  it('includes down sets 6-3 weeks out and strips them the final 2 weeks', () => {
    expect(calculatePeakingSets(1, 6, TM).downSets).toEqual({ weight: 240, sets: 3, reps: 3 }); // 80%
    expect(calculatePeakingSets(2, 6, TM).downSets).toEqual({ weight: 245, sets: 3, reps: 3 }); // 82%
    expect(calculatePeakingSets(3, 6, TM).downSets).toEqual({ weight: 250, sets: 2, reps: 3 }); // 84% -> 252 -> 250
    expect(calculatePeakingSets(4, 6, TM).downSets).toEqual({ weight: 255, sets: 2, reps: 2 }); // 85%
    expect(calculatePeakingSets(5, 6, TM).downSets).toBeUndefined();
    expect(calculatePeakingSets(6, 6, TM).downSets).toBeUndefined();
  });

  it('maps a standard 3-week peak onto the last 3 weeks of the taper', () => {
    expect(calculatePeakingSets(1, 3, TM).weight).toBe(290);  // 3 out: 97%
    expect(calculatePeakingSets(1, 3, TM).downSets).toBeDefined();
    expect(calculatePeakingSets(2, 3, TM).weight).toBe(305);  // 2 out: peak single
    expect(calculatePeakingSets(3, 3, TM).weight).toBe(255);  // 1 out: opener weight
    expect(calculatePeakingSets(3, 3, TM).downSets).toBeUndefined();
  });

  it('rounds to 2.5 kg increments in kg mode', () => {
    // 2 weeks out, TM 200 kg: 204 -> 205
    expect(calculatePeakingSets(2, 3, 200, 'kg', 'squat').weight).toBe(205);
    // 6 weeks out down sets: 160 exactly
    expect(calculatePeakingSets(1, 6, 200, 'kg').downSets?.weight).toBe(160);
  });
});

describe('calculatePlateBreakdown', () => {
  const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

  it('loads an exact target with heaviest plates first', () => {
    // 180 lb: (180-45)/2 = 67.5/side -> 45 + 10 + 10 + 2.5
    const b = calculatePlateBreakdown(180, 45, LB_PLATES);
    expect(b).not.toBeNull();
    expect(b!.exact).toBe(true);
    expect(b!.loadedWeight).toBe(180);
    expect(b!.plates).toEqual([
      { weight: 45, count: 1 },
      { weight: 10, count: 2 },
      { weight: 2.5, count: 1 },
    ]);
  });

  it('returns the nearest loadable weight below an unreachable target', () => {
    // No 2.5s available: 180 -> per side 67.5, loadable 65 -> total 175
    const b = calculatePlateBreakdown(180, 45, [45, 35, 25, 10, 5]);
    expect(b!.exact).toBe(false);
    expect(b!.loadedWeight).toBe(175);
  });

  it('handles the empty bar and below-bar targets', () => {
    const bar = calculatePlateBreakdown(45, 45, LB_PLATES);
    expect(bar!.plates).toEqual([]);
    expect(bar!.exact).toBe(true);
    expect(calculatePlateBreakdown(40, 45, LB_PLATES)).toBeNull();
  });

  it('works in kg with a 20 kg bar', () => {
    // 100 kg: 40/side -> 25 + 15
    const b = calculatePlateBreakdown(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    expect(b!.exact).toBe(true);
    expect(b!.plates).toEqual([
      { weight: 25, count: 1 },
      { weight: 15, count: 1 },
    ]);
  });
});

describe('formatPlateBreakdown', () => {
  it('collapses repeated plates and joins with dots', () => {
    const b = calculatePlateBreakdown(230, 45, [45, 35, 25, 10, 5, 2.5]);
    // (230-45)/2 = 92.5 -> 45x2 + 2.5
    expect(formatPlateBreakdown(b!)).toBe('45×2 · 2.5');
  });

  it('labels the empty bar', () => {
    const b = calculatePlateBreakdown(45, 45, [45]);
    expect(formatPlateBreakdown(b!)).toBe('empty bar');
  });
});
