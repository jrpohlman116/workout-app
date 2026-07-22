import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeklyVariationCredit } from '../../hooks/useWeeklyVariationCredit';

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
      { lift_type: 'upper', exercises_data: [{ name: 'Pause Squats', reps: '5-8', sets: 2, isBodyweight: false }] },
    ];

    const { result } = renderHook(() =>
      useWeeklyVariationCredit('user-1', 'squat', 'intensification', { squat: [], bench: [], deadlift: [] })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Intensification has no phase modifier, so sets pass through unchanged
    expect(result.current.variationSetsPlanned).toBe(5);
    expect(result.current.contributions).toHaveLength(2);
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
});
