import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeklyVariationCredit } from '../../hooks/useWeeklyVariationCredit';
import type { DayDef } from '../../lib/programs/types';

type TestDay = Pick<DayDef, 'dayId' | 'variationSlots'>;

// workout_templates rows keyed by lift_type, settable per test
let mockRows: { lift_type: string; exercises_data: unknown }[] = [];

// vi.mock factories are hoisted above imports by vitest's transform, so
// declaration order here doesn't matter — the hook always sees this mock.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn(() => Promise.resolve({ data: mockRows, error: null })),
    })),
  },
}));

describe('useWeeklyVariationCredit', () => {
  beforeEach(() => {
    mockRows = [];
  });

  it('does not query and returns zero credit for a non-credit phase', async () => {
    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'realization', { squat: [], bench: [], deadlift: [] })
    );
    // No async resolution needed — eligibility gate short-circuits synchronously
    expect(result.current.variationSetsPlanned).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.contributions).toEqual([]);
  });

  it('returns zero credit for the overhead press day too', async () => {
    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'ohp', 'accumulation', { squat: [], bench: [], deadlift: [] })
    );
    expect(result.current.variationSetsPlanned).toBe(0);
  });

  it('scans only the days it is given', async () => {
    mockRows = [
      { lift_type: 'deadlift', exercises_data: [{ name: 'Pin Squats', reps: '5-8', sets: 3, isBodyweight: false }] },
      { lift_type: 'ohp', exercises_data: [{ name: 'Pause Squats', reps: '5-8', sets: 2, isBodyweight: false }] },
    ];
    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'intensification', { squat: [], bench: [], deadlift: [] }, undefined, [{ dayId: 'squat' }, { dayId: 'deadlift' }])
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    // The ohp row is outside the supplied layout, so only the deadlift day counts.
    expect(result.current.variationSetsPlanned).toBe(3);
    expect(result.current.contributions.map(c => c.dayLiftType)).toEqual(['deadlift']);
  });

  it('returns zero credit for upper day (not a main lift with its own weekly volume)', async () => {
    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'upper', 'accumulation', { squat: [], bench: [], deadlift: [] })
    );
    expect(result.current.variationSetsPlanned).toBe(0);
  });

  it('is undefined (not 0) while resolving, then sums matching variation sets from other days', async () => {
    mockRows = [
      {
        lift_type: 'deadlift',
        exercises_data: [
          { name: 'Pin Squats', reps: '5-8', sets: 3, isBodyweight: false }, // squat variation -> counts
          { name: 'Leg Press', reps: '5-8', sets: 3, isBodyweight: false },  // not a variation -> ignored
        ],
      },
    ];

    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'accumulation', { squat: [], bench: [], deadlift: [] })
    );

    // Before the async fetch resolves, must be undefined — never a stale 0
    expect(result.current.variationSetsPlanned).toBeUndefined();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Accumulation adds +1 set (ACCESSORY_PHASE_PLAN), so 3 -> 4
    expect(result.current.variationSetsPlanned).toBe(4);
    expect(result.current.contributions).toEqual([
      { dayLiftType: 'deadlift', exerciseName: 'Pin Squats', sets: 4 },
    ]);
  });

  it('sums contributions from multiple other days', async () => {
    mockRows = [
      { lift_type: 'deadlift', exercises_data: [{ name: 'Pin Squats', reps: '5-8', sets: 3, isBodyweight: false }] },
      { lift_type: 'ohp', exercises_data: [{ name: 'Pause Squats', reps: '5-8', sets: 2, isBodyweight: false }] },
    ];

    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'intensification', { squat: [], bench: [], deadlift: [] })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Intensification has no phase modifier, so sets pass through unchanged
    expect(result.current.variationSetsPlanned).toBe(5);
    expect(result.current.contributions).toHaveLength(2);
  });

  it('counts no-%TM barbell variations too, not just ones with a weight suggestion', async () => {
    mockRows = [
      { lift_type: 'deadlift', exercises_data: [{ name: '3-Second Pause Squat', reps: '3-5', sets: 3, isBodyweight: false }] },
    ];

    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'intensification', { squat: [], bench: [], deadlift: [] })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.variationSetsPlanned).toBe(3);
    expect(result.current.contributions).toEqual([
      { dayLiftType: 'deadlift', exerciseName: '3-Second Pause Squat', sets: 3 },
    ]);
  });

  it('ignores variations of other lifts', async () => {
    mockRows = [
      { lift_type: 'deadlift', exercises_data: [{ name: 'Board Press', reps: '5-8', sets: 3, isBodyweight: false }] }, // bench variation
    ];

    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'accumulation', { squat: [], bench: [], deadlift: [] })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.variationSetsPlanned).toBe(0);
    expect(result.current.contributions).toEqual([]);
  });

  it('counts bench variations on the deadlift day toward bench in the 3-day layout', async () => {
    // Bench weak point "off the chest" selects a bench variation for the deadlift day.
    mockRows = [];
    const days: TestDay[] = [
      { dayId: 'squat' },
      { dayId: 'bench' },
      { dayId: 'deadlift', variationSlots: ['squat', 'bench'] },
    ];
    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'bench', 'intensification',
        { squat: [], bench: ['in_the_hole'], deadlift: [] }, undefined, days)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.contributions.length).toBeGreaterThan(0);
    expect(result.current.contributions.every(c => c.dayLiftType === 'deadlift')).toBe(true);
  });

  it('counts nothing for bench from the same weak points in the 4-day layout', async () => {
    // With a dedicated overhead press day, bench variations live there, not on the deadlift day.
    mockRows = [];
    const days: TestDay[] = [{ dayId: 'squat' }, { dayId: 'ohp' }, { dayId: 'deadlift' }];
    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'bench', 'intensification',
        { squat: [], bench: ['in_the_hole'], deadlift: [] }, undefined, days)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.contributions.every(c => c.dayLiftType !== 'deadlift')).toBe(true);
  });
});
