import { describe, it, expect } from 'vitest';
import {
  BACKOFF_STEP_DOWN, BACKOFF_STEP_UP, EMPTY_BACKOFF_STATE, allBackoffsFull, backoffOffset,
  backoffStateFromHistory, nextBackoffAdjustment, nextBackoffState, withBackoffState,
} from '../../../lib/programs/backoffs';
import { backoffSetsOf, hasSecondSignal } from '../../../lib/programs/fiveThreeOne/engine';
import { getProgram } from '../../../lib/programs/registry';
import { prescribeDay } from '../../../lib/programs/prescription';
import type { SessionSummary, WeekBlock } from '../../../lib/programs/types';

// Accumulation: back-offs 5s, cap 5. Intensification: 3s, cap 5.
const session = (phase: SessionSummary['phase'], backoffReps: number[], extra: Partial<SessionSummary> = {}): SessionSummary => ({
  phase,
  mainSets: [
    { weight: 180, reps: 5, kind: 'top' },
    ...backoffReps.map(reps => ({ weight: 160, reps, kind: 'backoff' as const })),
  ],
  ...extra,
});
const full = () => session('accumulation', [5, 5, 5, 5, 5]);
const firstDrop = () => session('accumulation', [4]);
const midMiss = () => session('accumulation', [5, 5, 4]);

describe('back-off sets', () => {
  it('reads tagged sets by kind', () => {
    const s: SessionSummary = { phase: 'accumulation', mainSets: [
      { weight: 180, reps: 5, kind: 'top' }, { weight: 160, reps: 5, kind: 'backoff' }, { weight: 100, reps: 5, kind: 'secondary' },
    ] };
    expect(backoffSetsOf(s)).toEqual([{ weight: 160, reps: 5, kind: 'backoff' }]);
  });

  it('treats everything after the first set as a back-off on untagged sessions', () => {
    const s: SessionSummary = { phase: 'accumulation', mainSets: [{ weight: 180, reps: 5 }, { weight: 160, reps: 4 }] };
    expect(backoffSetsOf(s)).toEqual([{ weight: 160, reps: 4 }]);
  });

  it('is full only when the cap is reached with every set at target', () => {
    expect(allBackoffsFull(full())).toBe(true);
    expect(allBackoffsFull(session('accumulation', [5, 5, 5, 5]))).toBe(false);
    expect(allBackoffsFull(midMiss())).toBe(false);
    // Realization caps at 2.
    expect(allBackoffsFull(session('realization', [3, 3]))).toBe(true);
  });

  it('the second signal counts first-set drop-offs on tagged sessions too', () => {
    expect(hasSecondSignal([firstDrop(), firstDrop()])).toBe(true);
    expect(hasSecondSignal([firstDrop(), midMiss()])).toBe(false);
  });
});

describe('back-off load progression', () => {
  it('+2.5% after all back-offs full in 2 sessions in a row', () => {
    expect(nextBackoffAdjustment([full()])).toBe(0);
    expect(nextBackoffAdjustment([full(), full()])).toBe(BACKOFF_STEP_UP);
    expect(backoffStateFromHistory([full(), full()]).pct).toBe(0.025);
  });

  it('-5% after drop-off on the first back-off in 2 sessions in a row', () => {
    expect(nextBackoffAdjustment([firstDrop(), firstDrop()])).toBe(BACKOFF_STEP_DOWN);
    expect(backoffStateFromHistory([firstDrop(), firstDrop()]).pct).toBe(-0.05);
  });

  it('anything else is no change, and breaks a streak', () => {
    expect(nextBackoffAdjustment([full(), midMiss(), full()])).toBe(0);
    expect(nextBackoffAdjustment([firstDrop(), midMiss(), firstDrop()])).toBe(0);
  });

  it('a streak restarts after it triggers', () => {
    const history = [full(), full(), full()];
    expect(nextBackoffAdjustment(history)).toBe(0);
    expect(backoffStateFromHistory([...history, full()]).pct).toBe(0.05);
  });

  it('capped sessions count toward neither streak and do not break one', () => {
    const capped = session('accumulation', [5, 5, 5], { backoffsCapped: true });
    expect(nextBackoffAdjustment([full(), capped, full()])).toBe(BACKOFF_STEP_UP);
    expect(nextBackoffState(EMPTY_BACKOFF_STATE, session('accumulation', [4], { backoffsCapped: true })).state)
      .toEqual(EMPTY_BACKOFF_STATE);
  });

  it('deload sessions do not count', () => {
    const easy = session('deload', [3, 3]);
    expect(nextBackoffAdjustment([easy, easy])).toBe(0);
  });

  it('records the wave the state was built in', () => {
    expect(backoffStateFromHistory([full()], 2).cycleIndex).toBe(2);
  });
});

describe('program_state', () => {
  it('reads an offset only in the wave it was built in', () => {
    const state = withBackoffState({ other: 1 }, 'squat', { pct: 0.025, fullStreak: 0, firstSetDropStreak: 0, cycleIndex: 1 });
    expect(state.other).toBe(1);
    expect(backoffOffset(state, 'squat', 1)).toBe(0.025);
    expect(backoffOffset(state, 'squat', 2)).toBe(0); // new wave: reset
    expect(backoffOffset(state, 'bench', 1)).toBe(0);
    expect(backoffOffset(undefined, 'squat', 1)).toBe(0);
  });

  it('prescribe applies the offset and rounds per lift', () => {
    const program = getProgram('five_three_one');
    const block: WeekBlock = { phase: 'accumulation', weekIndex: 0, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) };
    const up = withBackoffState({}, 'bench', { pct: 0.025, fullStreak: 0, firstSetDropStreak: 0, cycleIndex: 0 });
    const down = withBackoffState({}, 'squat', { pct: -0.05, fullStreak: 0, firstSetDropStreak: 0, cycleIndex: 0 });
    // Bench 147.5 x 0.675 = 99.56; x 1.025 = 102.05 -> 102.5 (2.5 lb step)
    expect(program.prescribe({ block, lift: 'bench', trainingMax: 147.5, unit: 'lb', state: up }).groups[1].weight).toBe(102.5);
    // Squat 240 x 0.675 = 162; x 0.95 = 153.9 -> 155 (5 lb step)
    expect(program.prescribe({ block, lift: 'squat', trainingMax: 240, unit: 'lb', state: down }).groups[1].weight).toBe(155);
    // The top set never moves.
    expect(program.prescribe({ block, lift: 'squat', trainingMax: 240, unit: 'lb', state: down }).groups[0].weight).toBe(180);
    // Another wave: no offset.
    expect(program.prescribe({ block: { ...block, cycleIndex: 1 }, lift: 'squat', trainingMax: 240, unit: 'lb', state: down }).groups[1].weight).toBe(160);
  });
});

describe('secondary lifts (5/3/1, 3 days)', () => {
  const program = getProgram('five_three_one');
  const layout = program.layout(3);
  const maxes = { squat: 240, bench: 147.5, deadlift: 255 };
  const block = (phase: WeekBlock['phase']): WeekBlock => ({ phase, weekIndex: 0, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) });
  const day = (id: string) => layout.days.find(d => d.dayId === id)!;

  it('bench back-offs on squat day and deadlift back-offs on bench day, capped at 3', () => {
    const squatDay = prescribeDay({ program, day: day('squat'), block: block('accumulation'), trainingMaxes: maxes, unit: 'lb' }).groups;
    expect(squatDay.map(g => g.kind)).toEqual(['top', 'backoff', 'secondary']);
    expect(squatDay[2]).toMatchObject({ lift: 'bench', weight: 100, reps: 5, sets: 3, stopRule: 'until-miss' });

    const benchDay = prescribeDay({ program, day: day('bench'), block: block('intensification'), trainingMaxes: maxes, unit: 'lb' }).groups;
    expect(benchDay[2]).toMatchObject({ lift: 'deadlift', weight: 200, reps: 3, sets: 3 });
  });

  it('deadlift day has none; the cap follows the week when it is lower', () => {
    expect(prescribeDay({ program, day: day('deadlift'), block: block('accumulation'), trainingMaxes: maxes, unit: 'lb' })
      .groups.some(g => g.kind === 'secondary')).toBe(false);
    const realization = prescribeDay({ program, day: day('squat'), block: block('realization'), trainingMaxes: maxes, unit: 'lb' }).groups;
    expect(realization[2].sets).toBe(2);
  });

  it('skips a secondary lift with no training max, and peaking weeks', () => {
    expect(prescribeDay({ program, day: day('squat'), block: block('accumulation'), trainingMaxes: { squat: 240 }, unit: 'lb' })
      .groups).toHaveLength(2);
    const peak: WeekBlock = { ...block('peaking'), peakWeek: 1, totalPeakWeeks: 3 };
    expect(prescribeDay({ program, day: day('squat'), block: peak, trainingMaxes: maxes, unit: 'lb' })
      .groups.some(g => g.kind === 'secondary')).toBe(false);
  });

  it('the 4-day layout and Juggernaut have no secondary lifts', () => {
    expect(program.layout(4).days.every(d => !d.secondary)).toBe(true);
    expect(getProgram('juggernaut').layout(3).days.every(d => !d.secondary)).toBe(true);
  });
});
