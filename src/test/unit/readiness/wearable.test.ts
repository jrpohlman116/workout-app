import { describe, it, expect } from 'vitest';
import { hrvLow, isHardRun, wearableSignals, withWearable, type WearableDay } from '../../../lib/readiness/wearable';
import { BANDS } from '../../../lib/readiness/score';
import type { Readiness } from '../../../lib/readiness/types';

const green: Readiness = { state: 'green', score: 80, source: 'training', signals: [], reason: 'On target.', learning: false };
const day = (over: Partial<WearableDay> = {}): WearableDay => ({
  date: '2026-11-27', hrvMs: 55, hrvBaselineMs: 55, sleepMinutes: 460, sleepBaselineMinutes: 450, runs: [], ...over,
});
const run = (minutes: number, avgHr?: number) => ({ startedAt: '2026-11-26T07:00:00Z', minutes, avgHr });

describe('wearable thresholds', () => {
  it('HRV 10% or more below baseline is low', () => {
    expect(hrvLow(day({ hrvMs: 49.5 }))).toBe(true);
    expect(hrvLow(day({ hrvMs: 50 }))).toBe(false);
    expect(hrvLow(day({ hrvMs: null }))).toBe(false);
  });

  it('a hard run is average HR above 160 or 60+ minutes', () => {
    expect(isHardRun(run(40, 168))).toBe(true);
    expect(isHardRun(run(60, 140))).toBe(true);
    expect(isHardRun(run(45, 160))).toBe(false);
  });

  it('names the signals in plain words', () => {
    expect(wearableSignals(day({ hrvMs: 48, runs: [run(50, 168)] })).map(s => s.text)).toEqual([
      'HRV 13% below your baseline (48 ms)',
      'Hard run in the last 24 hours: 50 min · average HR 168',
    ]);
  });
});

describe('readiness with a wearable', () => {
  it('Green when HRV, sleep and runs are fine, with a reason that names them', () => {
    const r = withWearable({ training: green, day: day({ runs: [run(30, 140)] }), trainingScore: 80 });
    expect(r).toMatchObject({ state: 'green', source: 'wearable' });
    expect(r.reason).toBe('HRV at baseline · 7h 40m sleep · no hard run in 24 hours.');
  });

  it('Yellow on low HRV or a hard run, even when training is Green', () => {
    expect(withWearable({ training: green, day: day({ hrvMs: 48 }), trainingScore: 80 }).state).toBe('yellow');
    expect(withWearable({ training: green, day: day({ runs: [run(70)] }), trainingScore: 80 }).state).toBe('yellow');
  });

  it('Red after 2 Yellow days in a row', () => {
    expect(withWearable({ training: green, day: day({ hrvMs: 48 }), yesterday: 'yellow', trainingScore: 80 }).state).toBe('red');
  });

  it('the stricter of training and wearable wins', () => {
    const yellowTraining: Readiness = { ...green, state: 'yellow', signals: [{ kind: 'early_dropoff', lift: 'bench', text: 'x' }] };
    expect(withWearable({ training: yellowTraining, day: day(), trainingScore: 60 }).state).toBe('yellow');
  });

  it('the score lands in the state band', () => {
    for (const d of [day(), day({ hrvMs: 40 }), day({ runs: [run(90, 175)] })]) {
      for (const yesterday of [null, 'yellow'] as const) {
        const r = withWearable({ training: green, day: d, yesterday, trainingScore: 80 });
        const [lo, hi] = BANDS[r.state];
        expect(r.score).toBeGreaterThanOrEqual(lo);
        expect(r.score).toBeLessThanOrEqual(hi);
      }
    }
  });
});
