import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from '../../components/features/Onboarding';
import { firstWave, programStructure } from '../../lib/onboarding';

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
                  data: { id: 'user-1', created_at: '2026-01-01T00:00:00Z', program_id: 'five_three_one', days_per_week: 3 },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'workout_sessions') return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      throw new Error(`unexpected table: ${table}`);
    }),
  },
}));

import { supabase } from '../../lib/supabase';

beforeEach(() => { vi.mocked(supabase.from).mockClear(); });

function profilePayload(): Record<string, unknown> {
  const fromMock = vi.mocked(supabase.from);
  const idx = fromMock.mock.calls.findIndex(c => c[0] === 'user_profiles');
  const result = fromMock.mock.results[idx].value as { update: ReturnType<typeof vi.fn> };
  return vi.mocked(result.update).mock.calls[0][0] as Record<string, unknown>;
}

type User = ReturnType<typeof userEvent.setup>;
const next = (user: User) => user.click(screen.getByRole('button', { name: 'Next' }));

/** Steps 1-3 with defaults, optionally 4 days. */
async function toMaxes(user: User, days: 3 | 4 = 3) {
  await next(user); // goal
  await user.click(screen.getByRole('button', { name: 'Skip for now' })); // meet date
  if (days === 4) await user.click(screen.getByRole('radio', { name: /4 days/ }));
  await next(user); // schedule
}

async function finish(user: User) {
  await next(user); // maxes
  await next(user); // equipment
  await next(user); // how Ironform trains
  await user.click(screen.getByRole('button', { name: 'Start week 1' }));
  await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles'));
}

describe('Onboarding', () => {
  it('shows only the step count and bar, seven steps', () => {
    render(<Onboarding />);
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '7');
  });

  it('starts new lifters on 5/3/1 with no program picker, and saves goal, schedule and plates', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await user.click(screen.getByRole('radio', { name: /Lift and run/ }));
    await next(user);
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.queryByRole('radiogroup', { name: 'Program' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '1–2 days' }));
    await next(user);
    await user.type(screen.getByLabelText('Squat 1RM (lb)'), '265');
    await finish(user);

    expect(profilePayload()).toMatchObject({
      program_id: 'five_three_one', days_per_week: 3, training_goal: 'lift_and_run', running_days_per_week: '1-2',
      unit_preference: 'lb', available_plates_lb: [45, 35, 25, 10, 5, 2.5], onboarding_completed: true,
    });
  });

  it('stores the entered 1RM as the tested max and 90% as the training max', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user);
    await user.type(screen.getByLabelText('Squat 1RM (lb)'), '265');
    await user.type(screen.getByLabelText('Bench Press 1RM (lb)'), '165');
    await finish(user);
    expect(profilePayload()).toMatchObject({
      squat_max: 240, squat_tested_max: 265, bench_max: 147.5, bench_tested_max: 165,
      deadlift_max: 0, deadlift_tested_max: null,
    });
  });

  it('logs each entered 1RM as a one-rep session', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user);
    await user.type(screen.getByLabelText('Squat 1RM (lb)'), '405');
    await finish(user);
    await waitFor(() => expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('workout_sessions'));
    const fromMock = vi.mocked(supabase.from);
    const idx = fromMock.mock.calls.findIndex(c => c[0] === 'workout_sessions');
    const result = fromMock.mock.results[idx].value as { insert: ReturnType<typeof vi.fn> };
    expect(vi.mocked(result.insert).mock.calls[0][0]).toEqual([
      expect.objectContaining({ lift_type: 'squat', weight_lifted: 405, calculated_1rm: 405, reps_performed: 1 }),
    ]);
  });

  it('needs at least one main lift to continue', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.type(screen.getByLabelText('Deadlift 1RM (lb)'), '285');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('estimates a max from a set', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user);
    const [estimate] = screen.getAllByRole('button', { name: 'Estimate from a set' });
    await user.click(estimate);
    const group = screen.getByRole('group', { name: /Estimate your Squat 1RM/ });
    await user.type(within(group).getByLabelText('Weight (lb)'), '225');
    await user.type(within(group).getByLabelText('Reps'), '5');
    await user.click(within(group).getByRole('button', { name: /^Use \d+ lb$/ }));
    expect(screen.getByLabelText('Squat 1RM (lb)')).not.toHaveValue(null);
  });

  it('asks for an optional overhead press max on 4 days only, saved as a pair', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Onboarding />);
    await toMaxes(user, 3);
    expect(screen.queryByLabelText(/Overhead press/)).not.toBeInTheDocument();
    unmount();

    render(<Onboarding />);
    await toMaxes(user, 4);
    await user.type(screen.getByLabelText('Squat 1RM (lb)'), '265');
    await user.type(screen.getByLabelText('Overhead press (optional) 1RM (lb)'), '135');
    await finish(user);
    expect(profilePayload()).toMatchObject({ days_per_week: 4, ohp_tested_max: 135, ohp_max: 122.5 });
  });

  it('shows the first wave from the engine, with loads rounded to the plates', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await toMaxes(user);
    await user.type(screen.getByLabelText('Squat 1RM (lb)'), '265');
    await next(user);
    await next(user);
    await next(user);
    expect(screen.getByText('Training max 240 lb')).toBeInTheDocument();
    expect(screen.getByText('180 lb × 5')).toBeInTheDocument();
    expect(screen.getByText('160 lb × 5')).toBeInTheDocument();
  });
});

describe('first wave and program structure', () => {
  it('matches the handoff fixture: 265 / 165 / 285', () => {
    const wave = firstWave({ days: 3, oneRepMaxes: { squat: 265, bench: 165, deadlift: 285 }, unit: 'lb', plates: [45, 35, 25, 10, 5, 2.5] });
    expect(wave.map(w => [w.lift, w.trainingMax, w.top.weight, w.backoff?.weight])).toEqual([
      ['squat', 240, 180, 160], ['bench', 147.5, 110, 100], ['deadlift', 255, 190, 170],
    ]);
  });

  it('describes the plan for a meet date', () => {
    // The engine counts the meet week too: 16 weeks fit three waves and a 3-week peak.
    expect(programStructure(16)).toBe('Three 4-week waves, then a 3-week peak and meet week.');
    expect(programStructure(15)).toBe('Two 4-week waves, then a 6-week peak and meet week.');
    expect(programStructure(2)).toMatch(/Not enough time/);
  });
});
