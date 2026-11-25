import { describe, it, expect } from 'vitest';
import {
  cycleWeekFromIndex, indexFromCycleWeek, positionUpdates, resolvePosition,
} from '../../../lib/programs/position';
import { calculateJuggernautSets } from '../../../lib/calculations';
import { CYCLE_TO_WAVE, WEEK_TO_PHASE } from '../../../lib/constants';

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

  it('repeats four-week waves with no peak block when there is no meet date', () => {
    const r = resolvePosition({ programStartDate, currentWeekIndex: 0 });
    expect(r.schedule.repeats).toBe(true);
    expect(r.schedule.peakWeekIndex).toBe(-1);
    expect(r.schedule.weeks.some(w => w.phase === 'peaking' || w.phase === 'meet_week')).toBe(false);
    expect(r.schedule.weeks.slice(0, 16).map(w => `${w.wave}${w.phase[0]}`)).toEqual([
      '10a', '10i', '10r', '10d', '8a', '8i', '8r', '8d', '5a', '5i', '5r', '5d', '3a', '3i', '3r', '3d',
    ]);
    // After the 3-rep wave it stays on 3s, as the manual cycle always did.
    expect(r.schedule.weeks[16].wave).toBe(3);
    expect(r.schedule.weeks[40].wave).toBe(3);
  });

  it('matches the old manual cycle for every cycle and week', () => {
    const { schedule } = resolvePosition({ programStartDate, currentWeekIndex: 0 });
    for (let cycle = 1; cycle <= 26; cycle++) {
      for (let week = 1; week <= 4; week++) {
        const block = schedule.weeks[indexFromCycleWeek(cycle, week)];
        expect(block.wave).toBe(CYCLE_TO_WAVE[cycle] ?? 3);
        expect(block.phase).toBe(WEEK_TO_PHASE[week]);
        expect(block.cycleIndex).toBe(cycle - 1);
      }
    }
  });

  it('prescribes what the old manual cycle did for each lift', () => {
    const { schedule, program } = resolvePosition({ programStartDate, currentWeekIndex: 0 });
    for (const lift of ['squat', 'bench', 'deadlift'] as const) {
      for (let cycle = 1; cycle <= 8; cycle++) {
        for (let week = 1; week <= 4; week++) {
          const block = schedule.weeks[indexFromCycleWeek(cycle, week)];
          const got = program.prescribe({ block, lift, trainingMax: 255, unit: 'lb' }).groups[0].weight;
          const old = calculateJuggernautSets(CYCLE_TO_WAVE[cycle] ?? 3, WEEK_TO_PHASE[week], 255, 'lb').weight;
          expect(got).toBe(old);
        }
      }
    }
  });

  it('starts a repeating schedule at the stored cycle and week when no index is stored yet', () => {
    const r = resolvePosition({ programStartDate, currentCycle: 2, currentWeek: 3 });
    expect(r.currentIndex).toBe(6);
    expect(r.currentBlock).toMatchObject({ wave: 8, phase: 'realization' });
  });

  it('starts at week 1 with no stored index, cycle or week', () => {
    expect(resolvePosition({ programStartDate }).currentIndex).toBe(0);
  });

  it('prefers a stored index over cycle and week', () => {
    expect(resolvePosition({ programStartDate, currentWeekIndex: 9, currentCycle: 1, currentWeek: 1 }).currentIndex).toBe(9);
  });

  it('clamps a cycle beyond the schedule to its last week', () => {
    const r = resolvePosition({ programStartDate, currentCycle: 999, currentWeek: 2 });
    expect(r.currentIndex).toBe(r.schedule.weeks.length - 1);
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
