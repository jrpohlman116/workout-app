import { describe, it, expect } from 'vitest';
import { backoffsDone, normalBackoffs, sessionSignals } from '../../../lib/readiness/signals';
import { BANDS, backoffPart, clampToBand, restPart, topSetPart, trainingScore, wearableScore } from '../../../lib/readiness/score';
import { applyCheckIn, computeReadiness, countedSessions, daysBetween } from '../../../lib/readiness/state';
import { cappedBackoffSets, lowersBackoffCap, sessionLimits } from '../../../lib/readiness/effects';
import { localDate, toReadinessSession } from '../../../lib/readiness/fromSessions';
import type { ReadinessSession } from '../../../lib/readiness/types';

// Accumulation-style session: top 5, back-offs 5s, cap 5.
let day = 0;
const date = (d: number) => new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10);
function s(over: Partial<ReadinessSession> = {}): ReadinessSession {
  day += 2;
  return {
    date: date(day), lift: 'squat', topReps: 5, topTarget: 5,
    backoffReps: [5, 5, 5, 5], backoffTarget: 5, backoffCap: 5, capped: false,
    ...over,
  };
}
const fresh = () => { day = 0; };
const todayAfter = (sessions: ReadinessSession[], days = 1) => {
  const last = sessions[sessions.length - 1].date;
  return new Date(Date.parse(`${last}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
};

describe('signals', () => {
  it('counts back-offs done at target before the first miss', () => {
    fresh();
    expect(backoffsDone(s({ backoffReps: [5, 5, 4, 5] }))).toBe(2);
    expect(backoffsDone(s({ backoffReps: [] }))).toBe(0);
  });

  it('normal is the median of the last 6 uncapped sessions with the same cap, once there are 3', () => {
    fresh();
    const a = s({ backoffReps: [5, 5, 5] });
    const b = s({ backoffReps: [5, 5, 5, 5, 5] });
    const capped = s({ backoffReps: [5], capped: true });
    const otherCap = s({ backoffReps: [3, 3], backoffCap: 2 });
    const bench = s({ lift: 'bench', backoffReps: [5] });
    const target = s();
    expect(normalBackoffs(target, [a, b, capped, otherCap, bench])).toBeNull();
    const c = s({ backoffReps: [5, 5, 5, 5] });
    expect(normalBackoffs(target, [a, b, c, capped, otherCap, bench])).toBe(4);
  });

  it('raises missed top set, short back-offs and early drop-off', () => {
    fresh();
    const earlier = [s(), s(), s()]; // normal 4
    expect(sessionSignals(s(), earlier)).toEqual([]);
    expect(sessionSignals(s({ topReps: 2, topTarget: 3 }), earlier).map(x => x.kind)).toEqual(['missed_top_set']);
    expect(sessionSignals(s({ backoffReps: [5, 5, 4] }), earlier).map(x => x.kind)).toEqual(['short_backoffs']);
    expect(sessionSignals(s({ backoffReps: [4] }), earlier).map(x => x.kind)).toEqual(['short_backoffs', 'early_dropoff']);
  });

  it('a capped session raises no back-off signals', () => {
    fresh();
    const earlier = [s(), s(), s()];
    expect(sessionSignals(s({ backoffReps: [4], capped: true }), earlier)).toEqual([]);
  });

  it('names the lift and numbers in plain language', () => {
    fresh();
    const [signal] = sessionSignals(s({ lift: 'bench', topReps: 2, topTarget: 3 }), []);
    expect(signal.text).toMatch(/Bench.*top set: 2 of 3 reps/);
  });
});

describe('score', () => {
  it('top set: 75 at the minimum, up to 100 above, lower below', () => {
    fresh();
    expect(topSetPart(s({ topReps: 3, topTarget: 3 }))).toBe(75);
    expect(topSetPart(s({ topReps: 8, topTarget: 3 }))).toBe(100);
    expect(topSetPart(s({ topReps: 4, topTarget: 3 }))).toBe(80);
    expect(topSetPart(s({ topReps: 2, topTarget: 4 }))).toBe(37.5);
  });

  it('back-offs: 75 at normal, up to 100 above, 75 with no normal or when capped', () => {
    fresh();
    const earlier = [s(), s(), s()]; // normal 4
    expect(backoffPart(s(), earlier)).toBe(75);
    expect(backoffPart(s({ backoffReps: [5, 5, 5, 5, 5] }), earlier)).toBe(87.5);
    expect(backoffPart(s({ backoffReps: [5, 5] }), earlier)).toBe(37.5);
    expect(backoffPart(s({ backoffReps: [5] }), [])).toBe(75);
    expect(backoffPart(s({ backoffReps: [5], capped: true }), earlier)).toBe(75);
  });

  it('rest: 0 days = 50, 1 = 80, 2 or more = 100', () => {
    expect([restPart(0), restPart(1), restPart(2), restPart(9)]).toEqual([50, 80, 100, 100]);
  });

  it('weights 40 / 40 / 20, and on target with 2 rest days scores 80', () => {
    fresh();
    expect(trainingScore([s(), s(), s(), s()], 2)).toBe(80);
  });

  it('clamps into the band of the state the rules chose', () => {
    expect(clampToBand(92, 'yellow')).toBe(69);
    expect(clampToBand(30, 'green')).toBe(70);
    expect(clampToBand(60.4, 'yellow')).toBe(60);
    expect(BANDS).toEqual({ green: [70, 100], yellow: [45, 69], red: [0, 44] });
  });

  it('with a wearable: 40% HRV, 30% sleep, 15% run load, 15% training', () => {
    expect(wearableScore({ hrv: 100, sleep: 50, runLoad: 0, training: 100 })).toBe(70);
  });
});

describe('readiness state', () => {
  it('the first 3 sessions are Green, learning your normal', () => {
    fresh();
    const sessions = [s({ topReps: 1 }), s({ topReps: 1 })];
    const r = computeReadiness({ sessions, today: todayAfter(sessions) });
    expect(r).toMatchObject({ state: 'green', learning: true });
    expect(r.note).toMatch(/Learning your normal: 1 more session/);
  });

  it('Green with no signals', () => {
    fresh();
    const sessions = [s(), s(), s(), s()];
    const r = computeReadiness({ sessions, today: todayAfter(sessions) });
    expect(r).toMatchObject({ state: 'green', learning: false, signals: [] });
    expect(r.reason).toBe('Your last 3 sessions were on target.');
  });

  it('Yellow with one signal', () => {
    fresh();
    const sessions = [s(), s(), s(), s({ topReps: 4 })];
    expect(computeReadiness({ sessions, today: todayAfter(sessions) }).state).toBe('yellow');
  });

  it('Yellow when 2 of the last 3 sessions scored below normal, even with no signal today', () => {
    fresh();
    // Back-offs of 3 against a normal of 4 are below normal but not 2 short.
    const sessions = [s(), s(), s(), s({ backoffReps: [5, 5, 5] }), s({ backoffReps: [5, 5, 5] }), s()];
    const r = computeReadiness({ sessions, today: todayAfter(sessions) });
    expect(r.signals).toEqual([]);
    expect(r.state).toBe('yellow');
    expect(r.reason).toMatch(/2 of your last 3 sessions came in below your normal/);
  });

  it('Red with 2 or more signals', () => {
    fresh();
    const sessions = [s(), s(), s(), s({ backoffReps: [4] })];
    expect(computeReadiness({ sessions, today: todayAfter(sessions) }).state).toBe('red');
  });

  it('Red after a missed top set 2 sessions in a row', () => {
    fresh();
    const sessions = [s(), s(), s(), s({ topReps: 4 }), s({ lift: 'bench', topReps: 2, topTarget: 3, backoffReps: [] })];
    const r = computeReadiness({ sessions, today: todayAfter(sessions) });
    expect(r.state).toBe('red');
    expect(r.reason).toBe('Missed the top set in your last 2 sessions.');
  });

  it('after 7 or more days off: Green with a note', () => {
    fresh();
    const sessions = [s(), s(), s(), s({ backoffReps: [4] })];
    const r = computeReadiness({ sessions, today: todayAfter(sessions, 8) });
    expect(r.state).toBe('green');
    expect(r.note).toMatch(/Welcome back/);
  });

  it('the first session back after a break does not count', () => {
    fresh();
    const before = [s(), s(), s()];
    day += 10;
    const back = s({ topReps: 1 });
    expect(countedSessions([...before, back])).toEqual(before);
    const sessions = [...before, back];
    expect(computeReadiness({ sessions, today: todayAfter(sessions) }).state).toBe('green');
  });

  it('"Rough" lowers the state one step; "Good" and "Okay" do not', () => {
    expect([applyCheckIn('green', 'rough'), applyCheckIn('yellow', 'rough'), applyCheckIn('red', 'rough')])
      .toEqual(['yellow', 'red', 'red']);
    expect([applyCheckIn('yellow', 'good'), applyCheckIn('yellow', 'okay'), applyCheckIn('yellow', null)])
      .toEqual(['yellow', 'yellow', 'yellow']);
    fresh();
    const sessions = [s(), s(), s(), s()];
    const r = computeReadiness({ sessions, today: todayAfter(sessions), checkIn: 'rough' });
    expect(r).toMatchObject({ state: 'yellow', stateBeforeCheckIn: 'green' });
    expect(r.score).toBeLessThanOrEqual(69);
  });

  it('the score always lands inside its state band', () => {
    fresh();
    const shapes: Partial<ReadinessSession>[] = [{}, { topReps: 4 }, { backoffReps: [4] }, { backoffReps: [5, 5] }, { topReps: 9 }];
    for (let i = 0; i < 40; i++) {
      const sessions = Array.from({ length: 3 + (i % 5) }, (_, k) => s(shapes[(i + k) % shapes.length]));
      for (const gap of [0, 1, 3]) {
        const r = computeReadiness({ sessions, today: todayAfter(sessions, gap) });
        const [lo, hi] = BANDS[r.state];
        expect(r.score).toBeGreaterThanOrEqual(lo);
        expect(r.score).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('counts days between local dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
  });
});

describe('session limits', () => {
  it('Yellow day plus 30 min: back-off cap 2 (time is stricter), only the priority accessory', () => {
    const limits = sessionLimits('yellow', 30);
    expect(limits).toMatchObject({ backoffCap: 2, extraAccessories: 0, keepPriorityAccessory: true, topSetOnly: false, limitedBy: 'time' });
    expect(cappedBackoffSets(5, limits)).toBe(2);
  });

  it('Yellow at 60+ min: cap 3, accessories halved, priority kept', () => {
    expect(sessionLimits('yellow', 60)).toMatchObject({ backoffCap: 3, extraAccessories: 'half', keepPriorityAccessory: true, limitedBy: 'readiness' });
  });

  it('Red: top set only', () => {
    expect(sessionLimits('red', 60)).toMatchObject({ backoffCap: 0, extraAccessories: 0, keepPriorityAccessory: false, topSetOnly: true });
  });

  it('Green: 60+ is the full session; 45 is cap 2 plus one accessory', () => {
    expect(sessionLimits('green', 60)).toMatchObject({ backoffCap: null, extraAccessories: 'all', limitedBy: 'none' });
    expect(sessionLimits('green', 45)).toMatchObject({ backoffCap: 2, extraAccessories: 1, limitedBy: 'time' });
    expect(sessionLimits('yellow', 45).extraAccessories).toBe(1);
  });

  it('a cap counts as lowered only when it is below the program cap', () => {
    expect(lowersBackoffCap(5, sessionLimits('green', 30))).toBe(true);
    // Realization already caps at 2.
    expect(lowersBackoffCap(2, sessionLimits('green', 30))).toBe(false);
    expect(lowersBackoffCap(5, sessionLimits('green', 60))).toBe(false);
  });
});

describe('reading saved sessions', () => {
  const row = {
    completed_at: '2026-11-20T18:00:00Z', lift_type: 'squat', phase: 'accumulation' as const, wave: null,
    program_id: 'five_three_one',
    main_sets_data: [
      { reps: '5', weight: '180', kind: 'top' as const, checked: true },
      { reps: '5', weight: '160', kind: 'backoff' as const, checked: true },
      { reps: '4', weight: '160', kind: 'backoff' as const, checked: true },
      { reps: '5', weight: '160', kind: 'backoff' as const, checked: false },
    ],
  };

  it('takes targets from the 5/3/1 week and drops unchecked sets', () => {
    expect(toReadinessSession(row)).toMatchObject({
      lift: 'squat', topReps: 5, topTarget: 5, backoffReps: [5, 4], backoffTarget: 5, backoffCap: 5, capped: false,
    });
  });

  it('uses the AMRAP minimum as the realization target', () => {
    expect(toReadinessSession({ ...row, phase: 'realization', main_sets_data: [{ reps: '8', weight: '215', kind: 'top' }] }))
      .toMatchObject({ topReps: 8, topTarget: 3, backoffTarget: 3, backoffCap: 2 });
  });

  it('reads untagged Juggernaut sessions with the first set as the top set', () => {
    const jug = {
      completed_at: '2026-11-20T18:00:00Z', lift_type: 'bench', phase: 'accumulation' as const, wave: 10,
      program_id: 'juggernaut', main_sets_data: [{ reps: '10', weight: '100' }, { reps: '8', weight: '100' }],
    };
    expect(toReadinessSession(jug)).toMatchObject({ lift: 'bench', topReps: 10, topTarget: 10 });
  });

  it('skips sessions it can say nothing about', () => {
    expect(toReadinessSession({ ...row, lift_type: 'upper' })).toBeNull();
    expect(toReadinessSession({ ...row, phase: null })).toBeNull();
    expect(toReadinessSession({ ...row, main_sets_data: null })).toBeNull();
  });

  it('honors the stored cap and the capped flag', () => {
    expect(toReadinessSession({ ...row, backoffs_capped: true, backoff_cap: 2 })).toMatchObject({ capped: true, backoffCap: 2 });
  });

  it('formats a local date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
