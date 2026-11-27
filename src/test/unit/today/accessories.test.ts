import { describe, it, expect } from 'vitest';
import {
  accessoryTarget, formatRange, nextTimeNote, parseRepRange, prefillSet, summarizeSets, toLogged,
} from '../../../lib/today/accessories';
import { initialSession, sessionReducer } from '../../../lib/today/session';
import { calculateWarmupSets } from '../../../lib/calculations';

const range = parseRepRange('8-12')!;

describe('rep ranges', () => {
  it('parses ranges and single counts', () => {
    expect(parseRepRange('8-12')).toEqual({ min: 8, max: 12 });
    expect(parseRepRange('10–15')).toEqual({ min: 10, max: 15 });
    expect(parseRepRange('10')).toEqual({ min: 10, max: 10 });
    expect(parseRepRange('AMRAP')).toBeNull();
    expect(formatRange(range, '8-12')).toBe('8–12');
  });

  it('reads saved sets and drops empty ones', () => {
    expect(toLogged([{ weight: '50', reps: '12' }, { weight: '', reps: '' }])).toEqual([{ weight: 50, reps: 12 }]);
  });
});

describe('double progression', () => {
  const twelves = [{ weight: 45, reps: 12 }, { weight: 45, reps: 12 }, { weight: 45, reps: 12 }];

  it('top of the range on every set: up one step, reps back to the bottom', () => {
    const target = accessoryTarget(twelves, range, 3, 5);
    expect(target).toEqual({ weight: 50, movedUp: true, previousWeight: 45 });
    expect(prefillSet({ index: 0, today: [], last: twelves, target, range })).toEqual({ weight: 50, reps: 8 });
  });

  it('below the top on any set: same weight, first set prefilled from last time', () => {
    const last = [{ weight: 50, reps: 12 }, { weight: 50, reps: 11 }, { weight: 50, reps: 10 }];
    const target = accessoryTarget(last, range, 3, 5);
    expect(target).toEqual({ weight: 50, movedUp: false, previousWeight: 50 });
    expect(prefillSet({ index: 0, today: [], last, target, range })).toEqual({ weight: 50, reps: 12 });
  });

  it('fewer sets than planned does not move up', () => {
    expect(accessoryTarget(twelves.slice(0, 2), range, 3, 5).movedUp).toBe(false);
  });

  it('later sets prefill from the set before', () => {
    const target = accessoryTarget(twelves, range, 3, 5);
    expect(prefillSet({ index: 1, today: [{ weight: 50, reps: 9 }], last: twelves, target, range })).toEqual({ weight: 50, reps: 9 });
  });

  it('no history: the lifter picks the weight', () => {
    const target = accessoryTarget([], range, 3, 5);
    expect(target.weight).toBeNull();
    expect(prefillSet({ index: 0, today: [], last: [], target, range })).toEqual({ weight: 0, reps: 8 });
  });

  it('summarizes sets and says what happens next time', () => {
    expect(summarizeSets([{ weight: 100, reps: 12 }, { weight: 100, reps: 12 }], 'lb')).toBe('100 lb × 12, 12');
    expect(summarizeSets([{ weight: 100, reps: 12 }, { weight: 105, reps: 10 }], 'lb')).toBe('100 × 12, 105 × 10');
    expect(nextTimeNote(twelves, range, 3, 5, 'lb')).toBe('Hit 12 on every set. Up 5 lb next time, back to 8 reps.');
    expect(nextTimeNote([{ weight: 50, reps: 12 }, { weight: 50, reps: 9 }], range, 3, 5, 'lb'))
      .toBe('Range 8–12. Hit 12 on every set to move up. Same weight next time.');
  });
});

describe('warm-ups', () => {
  it('round to 5 lb on every lift and never change the top set', () => {
    const sets = calculateWarmupSets(112.5, 'lb', 'bench').fixedSets;
    expect(sets.every(s => s.weight % 5 === 0)).toBe(true);
    expect(sets[0]).toMatchObject({ weight: 45 });
  });
});

describe('session: warm-ups and accessories', () => {
  const now = 1_000_000;

  it('warm-ups start the warm-up rest; the last one does not', () => {
    let s = initialSession(60);
    s = sessionReducer(s, { type: 'logWarmup', total: 2, now, restSeconds: 60 });
    expect(s).toMatchObject({ warmupsDone: 1, restEndsAt: now + 60_000 });
    s = sessionReducer(s, { type: 'skipRest' });
    s = sessionReducer(s, { type: 'logWarmup', total: 2, now, restSeconds: 60 });
    expect(s).toMatchObject({ warmupsDone: 2, restEndsAt: null });
  });

  it('skip ends warm-ups and their rest', () => {
    let s = sessionReducer(initialSession(60), { type: 'logWarmup', total: 5, now, restSeconds: 60 });
    s = sessionReducer(s, { type: 'skipWarmups' });
    expect(s).toMatchObject({ warmupsSkipped: true, restEndsAt: null });
  });

  it('logs and edits accessory sets with accessory rest', () => {
    let s = sessionReducer(initialSession(60), { type: 'logAccessory', index: 1, set: { weight: 50, reps: 9 }, now, restSeconds: 90 });
    expect(s).toMatchObject({ stage: 'accessories', accessories: { 1: [{ weight: 50, reps: 9 }] }, restEndsAt: now + 90_000 });
    s = sessionReducer(s, { type: 'editAccessory', index: 1, setIndex: 0, set: { weight: 50, reps: 10 } });
    expect(s.accessories[1]).toEqual([{ weight: 50, reps: 10 }]);
  });

  it('a swap is for today only and starts the exercise fresh', () => {
    let s = sessionReducer(initialSession(60), { type: 'logAccessory', index: 2, set: { weight: 50, reps: 9 }, now, restSeconds: 90 });
    s = sessionReducer(s, { type: 'swap', index: 2, name: 'Rope Pressdowns' });
    expect(s.swaps).toEqual({ 2: 'Rope Pressdowns' });
    expect(s.accessories[2]).toBeUndefined();
  });

  it('"Do it anyway" brings a cut accessory back once', () => {
    let s = sessionReducer(initialSession(30), { type: 'doAnyway', index: 1 });
    s = sessionReducer(s, { type: 'doAnyway', index: 1 });
    expect(s.restored).toEqual([1]);
  });

  it('restores an older draft with the new fields filled in', () => {
    const old = { stage: 'backoffs', time: 60, top: null, backoffs: [], backoffsEnded: false, restEndsAt: null, restTotal: 0, startedAt: null };
    const s = sessionReducer(initialSession(60), { type: 'restore', session: old as never });
    expect(s).toMatchObject({ stage: 'backoffs', warmupsDone: 0, accessories: {}, swaps: {}, restored: [] });
  });
});
