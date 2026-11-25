import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: { table: string; op: string; payload?: Record<string, unknown>; filters: [string, unknown][] }[] = [];
let failTable: string | null = null;

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const entry = { table, op: '', payload: undefined as Record<string, unknown> | undefined, filters: [] as [string, unknown][] };
      calls.push(entry);
      const result = () => Promise.resolve({ error: failTable === table ? new Error('db down') : null });
      const chain: Record<string, unknown> = {
        update: (p: Record<string, unknown>) => { entry.op = 'update'; entry.payload = p; return chain; },
        delete: () => { entry.op = 'delete'; return chain; },
        eq: (col: string, val: unknown) => {
          entry.filters.push([col, val]);
          // update().eq() resolves; delete().eq().eq() resolves on the last eq
          return Object.assign(result(), chain);
        },
      };
      return chain;
    },
  },
}));

import { restartProgram, resetDefaultTemplates } from '../../../lib/programs/restart';

const profileUpdate = () => calls.find(c => c.table === 'user_profiles')!;
const templateDelete = () => calls.find(c => c.table === 'workout_templates');

beforeEach(() => { calls.length = 0; failTable = null; });

describe('restartProgram', () => {
  it('returns to week 1 on every position column', async () => {
    await restartProgram('u1');
    expect(profileUpdate().payload).toMatchObject({
      current_week_index: 0, current_cycle: 1, current_week: 1,
    });
    expect(profileUpdate().filters).toEqual([['id', 'u1']]);
  });

  it('stamps start date and restart time, clears review pointers, resets program state', async () => {
    await restartProgram('u1');
    const p = profileUpdate().payload!;
    expect(p.program_start_date).toBe(new Date().toISOString().split('T')[0]);
    expect(typeof p.program_restarted_at).toBe('string');
    expect(p.weak_points_reviewed_cycle).toBeNull();
    // The legacy reviewed-wave column is gone from some databases; never write it.
    expect('weak_points_reviewed_wave' in p).toBe(false);
    expect(p.program_state).toEqual({});
  });

  it('never touches training maxes or history', async () => {
    await restartProgram('u1', { meetDate: '2027-04-14' });
    const keys = Object.keys(profileUpdate().payload!);
    expect(keys.filter(k => /max/.test(k))).toEqual([]);
    expect(calls.some(c => c.table === 'workout_sessions')).toBe(false);
  });

  it('writes only the settings it was given', async () => {
    await restartProgram('u1');
    const p = profileUpdate().payload!;
    expect('meet_date' in p).toBe(false);
    expect('weak_points' in p).toBe(false);
    expect('split_style' in p).toBe(false);

    calls.length = 0;
    await restartProgram('u1', { meetDate: null, splitStyle: 'full_body', weakPoints: { squat: [], bench: [], deadlift: [] } });
    const q = profileUpdate().payload!;
    expect(q.meet_date).toBeNull();
    expect(q.split_style).toBe('full_body');
    expect(q.weak_points).toEqual({ squat: [], bench: [], deadlift: [] });
  });

  it('defaults to Juggernaut, 4 days, and keeps the previous values', async () => {
    await restartProgram('u1');
    expect(profileUpdate().payload).toMatchObject({ program_id: 'juggernaut', days_per_week: 4 });
    calls.length = 0;
    await restartProgram('u1', {}, { programId: 'juggernaut', daysPerWeek: 4 });
    expect(profileUpdate().payload).toMatchObject({ program_id: 'juggernaut', days_per_week: 4 });
  });

  it('rejects an unsupported program and days pair before writing anything', async () => {
    await expect(restartProgram('u1', { daysPerWeek: 5 as never })).rejects.toThrow(/does not support 5 days/);
    expect(calls).toEqual([]);
  });

  it('is repeatable: a second restart lands in the same place', async () => {
    await restartProgram('u1');
    const first = { ...profileUpdate().payload! };
    calls.length = 0;
    await restartProgram('u1');
    const second = profileUpdate().payload!;
    expect(second.current_week_index).toBe(first.current_week_index);
    expect(second.current_cycle).toBe(first.current_cycle);
    expect(second.current_week).toBe(first.current_week);
  });

  it('rebuilds default accessories only when the split changed', async () => {
    await restartProgram('u1', { splitStyle: 'upper_lower' }, { splitStyle: 'upper_lower' });
    expect(templateDelete()).toBeUndefined();

    calls.length = 0;
    await restartProgram('u1', { splitStyle: 'full_body' }, { splitStyle: 'upper_lower' });
    expect(templateDelete()?.op).toBe('delete');
    expect(templateDelete()?.filters).toEqual([['user_id', 'u1'], ['program_variation', 'standard']]);
  });

  it('throws when the profile update fails, and does not reset templates', async () => {
    failTable = 'user_profiles';
    await expect(restartProgram('u1', { splitStyle: 'full_body' }, { splitStyle: 'upper_lower' })).rejects.toThrow('db down');
    expect(templateDelete()).toBeUndefined();
  });

  it('throws when the template reset fails', async () => {
    failTable = 'workout_templates';
    await expect(resetDefaultTemplates('u1')).rejects.toThrow('db down');
  });
});
