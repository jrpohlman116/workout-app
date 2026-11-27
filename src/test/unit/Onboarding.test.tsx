import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

// Each test reads the profile update it triggered, not an earlier test's.
beforeEach(() => { vi.mocked(supabase.from).mockClear(); });

function getUserProfilesUpdatePayload(): Record<string, unknown> {
  const fromMock = vi.mocked(supabase.from);
  const idx = fromMock.mock.calls.findIndex(c => c[0] === 'user_profiles');
  const result = fromMock.mock.results[idx].value as { update: ReturnType<typeof vi.fn> };
  return vi.mocked(result.update).mock.calls[0][0] as Record<string, unknown>;
}

type User = ReturnType<typeof userEvent.setup>;

// Steps: 1 basics, 2 program and days, 3 maxes, 4 meet date, 5 sticking points.
async function throughBasics(user: User) {
  await user.type(screen.getByLabelText(/Your bodyweight/i), '180');
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

const daysGroup = () => screen.getByRole('radiogroup', { name: 'Days per week' });
const programGroup = () => screen.getByRole('radiogroup', { name: 'Program' });

describe('Onboarding — starting max mapping', () => {
  it('derives the training max from the entered 1RM rather than storing it directly, and records the tested max separately', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    await throughBasics(user);
    // Program and days: keep the defaults.
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Maxes: the form asks for a 1RM, not a training max.
    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Meet date: skip. Then sticking points: submit.
    await user.click(screen.getByRole('button', { name: 'Skip' }));
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

    await throughBasics(user);
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

describe('Onboarding — program and days', () => {
  it('defaults to Juggernaut, 4 days, and saves them', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await throughBasics(user);

    expect(within(daysGroup()).getByRole('radio', { name: /4 days/ })).toBeChecked();
    expect(within(programGroup()).getByRole('radio', { name: /Juggernaut/ })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Start Training' }));
    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles'));

    expect(getUserProfilesUpdatePayload()).toMatchObject({ program_id: 'juggernaut', days_per_week: 4 });
  });

  it('saves the chosen program and days', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await throughBasics(user);

    await user.click(within(daysGroup()).getByRole('radio', { name: /3 days/ }));
    await user.click(within(programGroup()).getByRole('radio', { name: /5\/3\/1/ }));
    expect(within(programGroup()).getByRole('radio', { name: /5\/3\/1/ })).toBeChecked();
    expect(within(daysGroup()).getByRole('radio', { name: /3 days/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Start Training' }));
    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles'));

    expect(getUserProfilesUpdatePayload()).toMatchObject({ program_id: 'five_three_one', days_per_week: 3 });
  });

  it('describes each day count by its lifts', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await throughBasics(user);
    expect(within(daysGroup()).getByRole('radio', { name: /3 days/ })).toHaveTextContent('squat, bench, deadlift');
    expect(within(daysGroup()).getByRole('radio', { name: /4 days/ })).toHaveTextContent('overhead press');
  });
});

describe('Onboarding — optional overhead press max', () => {
  async function toMaxes(user: User, days: '3' | '4') {
    await throughBasics(user);
    await user.click(within(daysGroup()).getByRole('radio', { name: new RegExp(`${days} days`) }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }

  it('is asked for on the 4-day layout and not on the 3-day layout', async () => {
    const four = userEvent.setup();
    const { unmount } = render(<Onboarding />);
    await toMaxes(four, '4');
    expect(screen.getByLabelText('Overhead press (optional) one rep max in lb')).toBeInTheDocument();
    unmount();

    const three = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(three, '3');
    expect(screen.queryByLabelText(/Overhead press/)).not.toBeInTheDocument();
  });

  it('saves a max as a pair: tested max and a 90% training max', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user, '4');
    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.type(screen.getByLabelText('Overhead press (optional) one rep max in lb'), '135');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Start Training' }));
    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles'));

    // 135 * 0.9 = 121.5, rounded to overhead press's 2.5 lb step
    expect(getUserProfilesUpdatePayload()).toMatchObject({ ohp_tested_max: 135, ohp_max: 122.5 });
  });

  it('writes no overhead press fields when it is skipped', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user, '4');
    await user.type(screen.getByLabelText('Squat one rep max in lb'), '405');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Start Training' }));
    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles'));

    const payload = getUserProfilesUpdatePayload();
    expect('ohp_max' in payload).toBe(false);
    expect('ohp_tested_max' in payload).toBe(false);
  });

  it('does not count as one of the lifts needed to continue', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user, '4');
    await user.type(screen.getByLabelText('Overhead press (optional) one rep max in lb'), '135');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
