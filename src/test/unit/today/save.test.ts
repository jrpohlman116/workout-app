import { describe, it, expect, vi } from 'vitest';
import { getProgram } from '../../../lib/programs/registry';
import { nextTrainingMax } from '../../../lib/programs/fiveThreeOne/engine';
import type { WeekBlock } from '../../../lib/programs/types';
import { buildTodayPlan } from '../../../lib/today/plan';
import { initialSession, sessionReducer } from '../../../lib/today/session';
import { buildSessionRows } from '../../../lib/today/save';
import { backoffResult, tmDelta, tmSteps } from '../../../lib/today/summary';

vi.mock('../../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const program = getProgram('five_three_one');
const block: WeekBlock = { phase: 'intensification', weekIndex: 1, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) };
const day = program.layout(3).days[1];
const accessories = [{ name: 'Cable Rows', sets: 3, reps: '10-15' }, { name: 'Dumbbell Press', sets: 3, reps: '8-12' }];
const plan = (time: 30 | 60) => buildTodayPlan({
  program, day, block, trainingMaxes: { bench: 147.5, squat: 240, deadlift: 255 }, unit: 'lb',
  readiness: 'yellow', time, accessories, plates: [45, 35, 25, 10, 5, 2.5],
});

describe('saved session rows', () => {
  const now = 1_000_000;
  let s = sessionReducer(initialSession(30), { type: 'start', now });
  s = sessionReducer(s, { type: 'logTop', set: { weight: 125, reps: 3 }, now, restSeconds: 180 });
  s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 3 }, target: 3, cap: 2, now, restSeconds: 180 });
  s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 3 }, target: 3, cap: 2, now, restSeconds: 180 });
  s = sessionReducer(s, { type: 'logWarmup', total: 5, now, restSeconds: 60 });
  s = sessionReducer(s, { type: 'logAccessory', index: 0, set: { weight: 100, reps: 12 }, now, restSeconds: 90 });
  s = sessionReducer(s, { type: 'swap', index: 1, name: 'Close-Grip Bench' });

  const rows = buildSessionRows({
    userId: 'u1',
    profile: { current_cycle: 1, current_week: 2, program_id: 'five_three_one', days_per_week: 3 },
    lift: 'bench', block, plan: plan(30), session: s,
    readiness: { state: 'yellow', score: 58 },
    accessoryNames: ['Cable Rows', 'Close-Grip Bench'],
  });

  it('records the top set, tagged back-offs and the limits the session ran under', () => {
    expect(rows.session).toMatchObject({
      user_id: 'u1', lift_type: 'bench', cycle: 1, week: 2, weight_lifted: 125, reps_performed: 3,
      phase: 'intensification', program_id: 'five_three_one',
      readiness_state: 'yellow', readiness_score: 58, time_available_min: 30,
      backoffs_capped: true, backoff_cap: 2,
      main_sets_data: [
        { weight: '125', reps: '3', kind: 'top', checked: true },
        { weight: '115', reps: '3', kind: 'backoff', checked: true },
        { weight: '115', reps: '3', kind: 'backoff', checked: true },
      ],
    });
  });

  it('never saves warm-ups with the main sets', () => {
    expect((rows.session.main_sets_data as unknown[]).length).toBe(3);
  });

  it('saves only accessories with logged sets, under the name done today', () => {
    expect(rows.accessories).toEqual([
      { exercise_name: 'Cable Rows', exercise_order: 0, sets_data: [{ weight: '100', reps: '12' }] },
    ]);
  });
});

describe('summary words', () => {
  it('counts full back-offs and where they dropped off', () => {
    expect(backoffResult([{ weight: 115, reps: 3 }, { weight: 115, reps: 3 }, { weight: 115, reps: 3 }, { weight: 115, reps: 2 }], 3))
      .toEqual({ full: 3, dropOffAt: 4 });
    expect(backoffResult([{ weight: 115, reps: 3 }], 3)).toEqual({ full: 1, dropOffAt: null });
  });

  it('explains the handoff example: squat 215 x 8 at TM 240 -> 250', () => {
    const update = nextTrainingMax({ lift: 'squat', currentTm: 240, topSet: { weight: 215, reps: 8 }, unit: 'lb' });
    expect(tmSteps({ liftName: 'Squat', lift: 'squat', unit: 'lb', previousTm: 240, amrap: { weight: 215, reps: 8 }, update })).toEqual([
      'You lifted 215 lb × 8 on the AMRAP set.',
      'Estimated 1RM ≈ 272 lb. 90% of that is 245 lb.',
      'You hit the 3-rep minimum, so squat gets the fixed +10 lb: 250 lb.',
      'Ironform takes the larger of the two, capped at +5% (252 lb). Result: 250 lb.',
    ]);
    expect(tmDelta(240, 250, 'lb')).toBe('+10 lb');
  });

  it('explains a hold', () => {
    const update = nextTrainingMax({ lift: 'squat', currentTm: 240, topSet: { weight: 215, reps: 2 }, unit: 'lb' });
    const steps = tmSteps({ liftName: 'Squat', lift: 'squat', unit: 'lb', previousTm: 240, amrap: { weight: 215, reps: 2 }, update });
    expect(steps[2]).toMatch(/holds at 240 lb/);
    expect(tmDelta(240, 240, 'lb')).toBe('No change');
  });
});
