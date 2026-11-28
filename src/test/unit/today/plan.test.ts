import { describe, it, expect } from 'vitest';
import { getProgram } from '../../../lib/programs/registry';
import type { WeekBlock } from '../../../lib/programs/types';
import { buildTodayPlan, estimateMinutes, explainWeight, planAccessories, platesPerSide } from '../../../lib/today/plan';
import { sessionLimits } from '../../../lib/readiness/effects';
import { backoffsEnd, initialSession, sessionReducer, toDraft } from '../../../lib/today/session';
import { activeSessionFromDraft } from '../../../hooks/useActiveSession';

const PLATES = [45, 35, 25, 10, 5, 2.5];
const program = getProgram('five_three_one');
const day = program.layout(3).days[1]; // bench
const block = (phase: WeekBlock['phase']): WeekBlock => ({ phase, weekIndex: 1, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) });
const accessories = [
  { name: 'Cable Rows', sets: 3, reps: '10-15' },
  { name: 'Dumbbell Press', sets: 3, reps: '8-12' },
  { name: 'Tricep Pressdowns', sets: 3, reps: '8-12' },
];
const maxes = { squat: 240, bench: 147.5, deadlift: 255 };
const plan = (readiness: 'green' | 'yellow' | 'red', time: 30 | 45 | 60, phase: WeekBlock['phase'] = 'intensification') =>
  buildTodayPlan({ program, day, block: block(phase), trainingMaxes: maxes, unit: 'lb', readiness, time, accessories });

describe('plate math', () => {
  it('lists plates per side', () => {
    expect(platesPerSide(125, 45, PLATES)).toBe('35 + 5 per side');
    expect(platesPerSide(115, 45, PLATES)).toBe('35 per side');
    expect(platesPerSide(180, 45, PLATES)).toBe('45 + 10 + 10 + 2.5 per side');
    expect(platesPerSide(45, 45, PLATES)).toBe('Empty bar');
    expect(platesPerSide(30, 45, PLATES)).toBeNull();
  });
});

describe('today plan', () => {
  it('Green, 60+ min: the full session, back-offs up to 5', () => {
    const p = plan('green', 60);
    expect(p.top).toMatchObject({ weight: 125, reps: 3, pct: 0.85, trainingMax: 147.5 });
    expect(p.backoff).toMatchObject({ weight: 115, reps: 3, cap: 5, programCap: 5, stopRule: 'until-miss' });
    expect(p.accessories.map(a => a.cut)).toEqual([false, false, false]);
    expect(p.backoffsCapped).toBe(false);
    // Bench day carries deadlift back-offs in the 3-day layout.
    expect(p.secondary).toMatchObject([{ kind: 'secondary', lift: 'deadlift', sets: 3 }]);
  });

  it('Yellow plus 30 min: cap 2, same loads, only the priority accessory', () => {
    const p = plan('yellow', 30);
    expect(p.top?.weight).toBe(125);
    expect(p.backoff).toMatchObject({ weight: 115, cap: 2 });
    expect(p.accessories).toEqual([
      { name: 'Cable Rows', sets: 3, reps: '10-15', priority: true, cut: false },
      { name: 'Dumbbell Press', sets: 3, reps: '8-12', priority: false, cut: true },
      { name: 'Tricep Pressdowns', sets: 3, reps: '8-12', priority: false, cut: true },
    ]);
    expect(p.backoffsCapped).toBe(true);
    expect(p.secondary[0].sets).toBe(2);
  });

  it('Yellow at 60+: cap 3, half the other accessories', () => {
    const p = plan('yellow', 60);
    expect(p.backoff?.cap).toBe(3);
    expect(p.accessories.map(a => a.cut)).toEqual([false, false, true]);
  });

  it('Red: one light top set at the deload load, nothing else', () => {
    const p = plan('red', 60, 'realization');
    expect(p.topSetOnly).toBe(true);
    // Deload top set: 65% of 147.5 = 95.9 -> 95
    expect(p.top).toMatchObject({ weight: 95, reps: 3, isAmrap: false });
    expect(p.backoff).toBeNull();
    expect(p.secondary).toEqual([]);
    expect(p.accessories.every(a => a.cut)).toBe(true);
  });

  it('a realization week keeps its own cap of 2, and it does not count as capped', () => {
    const p = plan('green', 30, 'realization');
    expect(p.backoff?.cap).toBe(2);
    expect(p.backoffsCapped).toBe(false);
  });

  it('estimates the session length', () => {
    expect(plan('green', 60).minutes).toBeGreaterThan(plan('yellow', 30).minutes);
    expect(estimateMinutes({ top: null, backoff: null, accessories: [] })).toBe(5);
  });

  it('accessory limits by count', () => {
    expect(planAccessories(accessories, sessionLimits('green', 45)).map(a => a.cut)).toEqual([false, false, true]);
  });
});

describe('why this weight', () => {
  it('shows TM x % = raw, then the rounding and readiness', () => {
    expect(explainWeight({
      liftName: 'Bench', trainingMax: 147.5, pct: 0.85, weight: 125, lift: 'bench', unit: 'lb', weekLabel: 'Week 2', readiness: 'green',
    }).rows).toEqual([
      { label: 'Bench training max', value: '147.5 lb' },
      { label: 'Week 2 top set', value: '85%' },
      { label: '147.5 × 0.85', value: '125.4 lb' },
      { label: 'Rounded to the nearest 2.5 lb', value: '125 lb' },
      { label: 'Readiness today', value: 'Green · no change' },
    ]);
  });
});

describe('session', () => {
  const now = 1_000_000;

  it('moves from before to top set to back-offs, starting rest after a set', () => {
    let s = initialSession(60);
    s = sessionReducer(s, { type: 'setTime', time: 30 });
    expect(s.time).toBe(30);
    s = sessionReducer(s, { type: 'start', now });
    expect(s.stage).toBe('top');
    s = sessionReducer(s, { type: 'logTop', set: { weight: 125, reps: 3 }, now, restSeconds: 180 });
    expect(s).toMatchObject({ stage: 'backoffs', restEndsAt: now + 180_000 });
    // Time is fixed once the session starts.
    expect(sessionReducer(s, { type: 'setTime', time: 60 }).time).toBe(30);
  });

  it('back-offs 115 x 3: 3, 3, 3, then 2 ends them after the miss', () => {
    let s = sessionReducer(initialSession(60), { type: 'start', now });
    s = sessionReducer(s, { type: 'logTop', set: { weight: 125, reps: 3 }, now, restSeconds: 180 });
    for (const reps of [3, 3, 3]) s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps }, target: 3, cap: 5, now, restSeconds: 180 });
    expect(s.backoffsEnded).toBe(false);
    s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 2 }, target: 3, cap: 5, now, restSeconds: 180 });
    expect(s).toMatchObject({ backoffsEnded: true, restEndsAt: null });
    expect(s.backoffs).toHaveLength(4);
    // Logging more after the end does nothing.
    expect(sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 3 }, target: 3, cap: 5, now, restSeconds: 180 })).toBe(s);
  });

  it('ends at the cap', () => {
    expect(backoffsEnd([{ weight: 115, reps: 3 }, { weight: 115, reps: 3 }], 3, 2)).toBe(true);
  });

  it('editing a set into a miss ends the back-offs there; fixing it reopens them', () => {
    let s = sessionReducer(initialSession(60), { type: 'start', now });
    for (const reps of [3, 3, 3]) s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps }, target: 3, cap: 5, now, restSeconds: 180 });
    s = sessionReducer(s, { type: 'editBackoff', index: 1, set: { weight: 115, reps: 2 }, target: 3, cap: 5 });
    expect(s.backoffs).toHaveLength(2);
    expect(s.backoffsEnded).toBe(true);
    s = sessionReducer(s, { type: 'editBackoff', index: 1, set: { weight: 115, reps: 3 }, target: 3, cap: 5 });
    expect(s.backoffsEnded).toBe(false);
  });

  it('rest can be extended and skipped', () => {
    let s = sessionReducer(initialSession(60), { type: 'logTop', set: { weight: 125, reps: 3 }, now, restSeconds: 180 });
    s = sessionReducer(s, { type: 'extendRest', seconds: 30 });
    expect(s.restEndsAt).toBe(now + 210_000);
    expect(sessionReducer(s, { type: 'skipRest' }).restEndsAt).toBeNull();
  });

  it('writes a draft the workout bar can read', () => {
    let s = sessionReducer(initialSession(60), { type: 'start', now });
    s = sessionReducer(s, { type: 'logTop', set: { weight: 125, reps: 3 }, now, restSeconds: 180 });
    s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 3 }, target: 3, cap: 5, now, restSeconds: 180 });
    const draft = toDraft(s, { liftType: 'bench', plannedTop: { weight: 125, reps: 3 }, plannedBackoff: { weight: 115, reps: 3 }, cycle: 1, week: 2, now });
    expect(activeSessionFromDraft(draft, { now, cycle: 1, week: 2 })).toEqual({
      lift: 'bench', title: 'Bench Press · Back-off set 2', next: 'Next: 115 lb × 3', restSeconds: 180,
    });
  });
});
