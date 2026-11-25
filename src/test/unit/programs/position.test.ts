import { describe, it, expect } from 'vitest';
import {
  cycleWeekFromIndex, indexFromCycleWeek, positionUpdates, resolvePosition,
} from '../../../lib/programs/position';

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString().split('T')[0];
const start = Date.parse('2026-01-05T00:00:00.000Z');
const meetIn = (weeks: number) => iso(start + weeks * 7 * DAY);

describe('cycle/week <-> index', () => {
  it('round-trips for the first 3 cycles', () => {
    for (let i = 0; i < 12; i++) {
      const { cycle, week } = cycleWeekFromIndex(i);
      expect(indexFromCycleWeek(cycle, week)).toBe(i);
    }
  });

  it('maps known positions', () => {
    expect(cycleWeekFromIndex(0)).toEqual({ cycle: 1, week: 1 });
    expect(cycleWeekFromIndex(3)).toEqual({ cycle: 1, week: 4 });
    expect(cycleWeekFromIndex(4)).toEqual({ cycle: 2, week: 1 });
    expect(cycleWeekFromIndex(6)).toEqual({ cycle: 2, week: 3 });
  });

  it('clamps negatives to week 1', () => {
    expect(cycleWeekFromIndex(-5)).toEqual({ cycle: 1, week: 1 });
    expect(indexFromCycleWeek(0, 0)).toBe(0);
  });

  it('positionUpdates writes every position column together', () => {
    expect(positionUpdates(6)).toEqual({ current_week_index: 6, current_cycle: 2, current_week: 3 });
    expect(positionUpdates(0)).toEqual({ current_week_index: 0, current_cycle: 1, current_week: 1 });
  });
});

describe('resolvePosition', () => {
  const programStartDate = iso(start);

  it('has no schedule without a meet date', () => {
    const r = resolvePosition({ programStartDate });
    expect(r.schedule.weeks).toEqual([]);
    expect(r.currentIndex).toBe(-1);
    expect(r.currentBlock).toBeNull();
  });

  it('has no schedule when the meet is too close to fit any waves', () => {
    const r = resolvePosition({ programStartDate, meetDate: meetIn(4), now: start });
    expect(r.schedule.weeks).toEqual([]);
    expect(r.currentIndex).toBe(-1);
  });

  it('uses current_week_index once set, clamped to the schedule', () => {
    const meetDate = meetIn(20);
    const mid = resolvePosition({ programStartDate, meetDate, currentWeekIndex: 6, now: start });
    expect(mid.currentIndex).toBe(6);
    expect(mid.currentBlock).toBe(mid.schedule.weeks[6]);

    const over = resolvePosition({ programStartDate, meetDate, currentWeekIndex: 999, now: start });
    expect(over.currentIndex).toBe(over.schedule.weeks.length - 1);

    const neg = resolvePosition({ programStartDate, meetDate, currentWeekIndex: -3, now: start });
    expect(neg.currentIndex).toBe(0);
  });

  it('index 0 is the first week (the restart position)', () => {
    const r = resolvePosition({ programStartDate, meetDate: meetIn(20), currentWeekIndex: 0, now: start + 10 * 7 * DAY });
    expect(r.currentIndex).toBe(0);
    expect(r.currentBlock?.phase).toBe('accumulation');
  });

  it('falls back to the week containing today before an index is set', () => {
    const r = resolvePosition({ programStartDate, meetDate: meetIn(20), now: start + 2 * 7 * DAY + DAY });
    const weekOfToday = r.schedule.weeks.findIndex(w => w.weekIndex === 2);
    expect(r.currentIndex).toBe(weekOfToday);
  });

  it('uses the first upcoming week when today is before the schedule starts', () => {
    const r = resolvePosition({ programStartDate, meetDate: meetIn(20), now: start - 30 * DAY });
    expect(r.currentIndex).toBe(0);
  });

  it('defaults the start to 16 weeks before the meet', () => {
    const meet = Date.parse('2026-12-01T00:00:00.000Z');
    const r = resolvePosition({ meetDate: iso(meet), currentWeekIndex: 0 });
    expect(r.schedule.weeks.length).toBeGreaterThan(0);
  });

  it('falls back to Juggernaut for an unknown program id', () => {
    const r = resolvePosition({ programId: 'nope', programStartDate, meetDate: meetIn(20), currentWeekIndex: 0 });
    expect(r.program.id).toBe('juggernaut');
  });

  it('gives every week a cycle index that counts up, peak and meet weeks last', () => {
    const { schedule } = resolvePosition({ programStartDate, meetDate: meetIn(20), currentWeekIndex: 0 });
    const cycles = schedule.weeks.map(w => w.cycleIndex!);
    expect(cycles.every((c, i) => i === 0 || c >= cycles[i - 1])).toBe(true);
    expect(cycles[0]).toBe(0);
    const peaking = schedule.weeks.filter(w => w.phase === 'peaking' || w.phase === 'meet_week');
    expect(new Set(peaking.map(w => w.cycleIndex)).size).toBe(1);
    expect(peaking[0].cycleIndex).toBe(Math.max(...cycles.slice(0, schedule.peakWeekIndex)) + 1);
  });
});
