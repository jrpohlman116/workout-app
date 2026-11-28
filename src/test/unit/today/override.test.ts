import { describe, it, expect, vi } from 'vitest';
import { effectiveState, isOverridden, overrideFor } from '../../../lib/readiness/override';
import { initialSession, sessionReducer } from '../../../lib/today/session';
import { buildSessionRows } from '../../../lib/today/save';
import { buildTodayPlan } from '../../../lib/today/plan';
import { getProgram } from '../../../lib/programs/registry';
import type { WeekBlock } from '../../../lib/programs/types';

vi.mock('../../../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

describe('readiness override', () => {
  it('the choice wins over the suggestion; choosing the suggestion clears it', () => {
    expect(effectiveState({ state: 'yellow', overridden_to: 'green' })).toBe('green');
    expect(effectiveState({ state: 'yellow', overridden_to: null })).toBe('yellow');
    expect(effectiveState(null)).toBe('green');
    expect(isOverridden({ state: 'red', overridden_to: 'yellow' })).toBe(true);
    expect(overrideFor({ state: 'yellow' }, 'green')).toBe('green');
    expect(overrideFor({ state: 'yellow' }, 'yellow')).toBeNull();
  });

  it('overriding Yellow to Green restores the full plan with the same loads', () => {
    const program = getProgram('five_three_one');
    const block: WeekBlock = { phase: 'intensification', weekIndex: 1, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) };
    const args = { program, day: program.layout(3).days[1], block, trainingMaxes: { bench: 147.5 }, unit: 'lb' as const, time: 60 as const, accessories: [] };
    const yellow = buildTodayPlan({ ...args, readiness: 'yellow' });
    const green = buildTodayPlan({ ...args, readiness: effectiveState({ state: 'yellow', overridden_to: 'green' }) });
    expect(yellow.backoff?.cap).toBe(3);
    expect(green.backoff?.cap).toBe(5);
    expect(green.top?.weight).toBe(yellow.top?.weight);
    expect(green.backoff?.weight).toBe(yellow.backoff?.weight);
  });
});

describe('one more back-off set past a lowered cap', () => {
  const now = 1_000_000;
  const logged = () => {
    let s = sessionReducer(initialSession(30), { type: 'start', now });
    s = sessionReducer(s, { type: 'logTop', set: { weight: 125, reps: 3 }, now, restSeconds: 180 });
    for (let i = 0; i < 2; i++) s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 3 }, target: 3, cap: 2, now, restSeconds: 180 });
    return s;
  };

  it('reopens the back-offs and runs them to the program cap; a miss still ends them', () => {
    let s = logged();
    expect(s.backoffsEnded).toBe(true);
    s = sessionReducer(s, { type: 'raiseBackoffCap' });
    expect(s).toMatchObject({ backoffsEnded: false, backoffCapRaised: true });
    s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 3 }, target: 3, cap: 5, now, restSeconds: 180 });
    expect(s.backoffsEnded).toBe(false);
    s = sessionReducer(s, { type: 'logBackoff', set: { weight: 115, reps: 2 }, target: 3, cap: 5, now, restSeconds: 180 });
    expect(s.backoffsEnded).toBe(true);
    // Only once.
    expect(sessionReducer(s, { type: 'raiseBackoffCap' })).toBe(s);
  });

  it('a raised session is saved as uncapped with the program cap', () => {
    const program = getProgram('five_three_one');
    const block: WeekBlock = { phase: 'intensification', weekIndex: 1, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) };
    const plan = buildTodayPlan({ program, day: program.layout(3).days[1], block, trainingMaxes: { bench: 147.5 }, unit: 'lb', readiness: 'green', time: 30, accessories: [] });
    const base = { userId: 'u', profile: { current_cycle: 1, current_week: 2, program_id: 'five_three_one' as const, days_per_week: 3 as const }, lift: 'bench' as const, block, plan, readiness: null, accessoryNames: [] };
    expect(buildSessionRows({ ...base, session: logged() }).session).toMatchObject({ backoffs_capped: true, backoff_cap: 2 });
    const raised = sessionReducer(logged(), { type: 'raiseBackoffCap' });
    expect(buildSessionRows({ ...base, session: raised }).session).toMatchObject({ backoffs_capped: false, backoff_cap: 5 });
  });
});
