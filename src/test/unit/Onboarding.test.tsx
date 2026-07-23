import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from '../../components/features/Onboarding';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, refreshProfile: vi.fn() }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { id: 'user-1', created_at: '2026-01-01T00:00:00Z' },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'workout_sessions') {
        return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  },
}));

import { supabase } from '../../lib/supabase';

function getUserProfilesUpdatePayload(): Record<string, unknown> {
  const fromMock = vi.mocked(supabase.from);
  const idx = fromMock.mock.calls.findIndex(c => c[0] === 'user_profiles');
  const result = fromMock.mock.results[idx].value as { update: ReturnType<typeof vi.fn> };
  return vi.mocked(result.update).mock.calls[0][0] as Record<string, unknown>;
}

describe('Onboarding — starting max mapping', () => {
  it('derives the training max from the entered 1RM rather than storing it directly, and records the tested max separately', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    // Step 1: bodyweight is required to proceed.
    await user.type(screen.getByLabelText(/Your bodyweight/i), '180');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Step 2: the form asks for a 1RM, not a training max.
    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Step 3: skip the meet date.
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    // Step 4: skip weak points, submit.
    await user.click(screen.getByRole('button', { name: 'Start Training' }));

    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles'));

    const payload = getUserProfilesUpdatePayload();
    // 405 * 0.9 = 364.5, rounded to 365 — NOT 405 stored directly as the TM.
    expect(payload.squat_max).toBe(365);
    expect(payload.squat_tested_max).toBe(405);
    // Lifts left blank stay at the schema's existing conventions: 0 for the
    // not-nullable TM column, null (not 0) for the nullable tested-max column.
    expect(payload.bench_max).toBe(0);
    expect(payload.bench_tested_max).toBeNull();
    expect(payload.deadlift_max).toBe(0);
    expect(payload.deadlift_tested_max).toBeNull();
  });

  it('logs the initial workout_sessions row at the entered 1RM, not the derived training max', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    await user.type(screen.getByLabelText(/Your bodyweight/i), '180');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Start Training' }));

    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('workout_sessions'));

    const fromMock = vi.mocked(supabase.from);
    const idx = fromMock.mock.calls.findIndex(c => c[0] === 'workout_sessions');
    const result = fromMock.mock.results[idx].value as { insert: ReturnType<typeof vi.fn> };
    const [sessionInserts] = vi.mocked(result.insert).mock.calls[0] as [Array<Record<string, unknown>>];

    expect(sessionInserts).toHaveLength(1);
    expect(sessionInserts[0]).toMatchObject({ lift_type: 'squat', weight_lifted: 405, calculated_1rm: 405 });
  });
});
