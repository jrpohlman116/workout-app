import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingTab from '../../pages/Profile/tabs/TrainingTab';

const refreshProfile = vi.fn(() => Promise.resolve());
let profile: Record<string, unknown>;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, profile, refreshProfile }),
}));

const updateMock = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ update: updateMock })) },
}));

const restartProgram = vi.fn(() => Promise.resolve());
const resetDefaultTemplates = vi.fn(() => Promise.resolve());
vi.mock('../../lib/programs/restart', () => ({
  restartProgram: (...args: unknown[]) => (restartProgram as (...a: unknown[]) => Promise<void>)(...args),
  resetDefaultTemplates: (...args: unknown[]) => (resetDefaultTemplates as (...a: unknown[]) => Promise<void>)(...args),
}));

const daysGroup = () => screen.getByRole('radiogroup', { name: 'Days per week' });
const programGroup = () => screen.getByRole('radiogroup', { name: 'Program' });
const plainSave = () => screen.getByRole('button', { name: 'Save' });
const restartButton = () => screen.getByRole('button', { name: 'Save & restart program' });

beforeEach(() => {
  vi.clearAllMocks();
  profile = {
    id: 'user-1',
    program_id: 'juggernaut',
    days_per_week: 4,
    meet_date: '2027-04-14',
    weak_points: { squat: ['mid_range'], bench: [], deadlift: [] },
    split_style: 'upper_lower',
  };
});

describe('TrainingTab — program and days', () => {
  it('shows the current program and days selected, with plain Save available', () => {
    render(<TrainingTab />);
    expect(within(programGroup()).getByRole('radio', { name: /Juggernaut/ })).toBeChecked();
    expect(within(daysGroup()).getByRole('radio', { name: /4 days/ })).toBeChecked();
    expect(plainSave()).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('falls back to Juggernaut, 4 days for a profile with neither set', () => {
    profile = { id: 'user-1' };
    render(<TrainingTab />);
    expect(within(programGroup()).getByRole('radio', { name: /Juggernaut/ })).toBeChecked();
    expect(within(daysGroup()).getByRole('radio', { name: /4 days/ })).toBeChecked();
  });

  it('warns that changing days restarts the program, and turns plain Save off', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(within(daysGroup()).getByRole('radio', { name: /3 days/ }));

    expect(screen.getByRole('status')).toHaveTextContent(/restarts your program at week 1/);
    expect(plainSave()).toBeDisabled();
    expect(restartButton()).toBeEnabled();
  });

  it('warns the same way when the program changes', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(within(programGroup()).getByRole('radio', { name: /5\/3\/1/ }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(plainSave()).toBeDisabled();
  });

  it('clears the warning when the choice goes back to the current one', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(within(daysGroup()).getByRole('radio', { name: /3 days/ }));
    await user.click(within(daysGroup()).getByRole('radio', { name: /4 days/ }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(plainSave()).toBeEnabled();
  });

  it('switches only through the restart confirmation, passing the new program and days', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(within(daysGroup()).getByRole('radio', { name: /3 days/ }));
    await user.click(within(programGroup()).getByRole('radio', { name: /5\/3\/1/ }));
    await user.click(restartButton());

    // Nothing is written until the user confirms.
    expect(restartProgram).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/switching to 5\/3\/1, 3 days a week/i);
    expect(dialog).toHaveTextContent(/history and training maxes are kept/i);

    await user.click(within(dialog).getByRole('button', { name: 'Save & restart' }));
    await waitFor(() => expect(restartProgram).toHaveBeenCalledTimes(1));

    const [userId, changes, previous] = restartProgram.mock.calls[0] as unknown as [string, Record<string, unknown>, Record<string, unknown>];
    expect(userId).toBe('user-1');
    expect(changes).toMatchObject({ programId: 'five_three_one', daysPerWeek: 3, meetDate: '2027-04-14' });
    expect(previous).toMatchObject({ programId: 'juggernaut', daysPerWeek: 4, splitStyle: 'upper_lower' });
    expect(refreshProfile).toHaveBeenCalled();
  });

  it('cancelling the confirmation changes nothing', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(within(daysGroup()).getByRole('radio', { name: /3 days/ }));
    await user.click(restartButton());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(restartProgram).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('a plain restart keeps the current program and days', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(restartButton());
    expect(screen.getByRole('dialog')).not.toHaveTextContent(/switching to/i);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save & restart' }));
    await waitFor(() => expect(restartProgram).toHaveBeenCalledTimes(1));
    const changes = (restartProgram.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(changes).toMatchObject({ programId: 'juggernaut', daysPerWeek: 4 });
  });

  it('plain Save never writes the program or days', async () => {
    const user = userEvent.setup();
    render(<TrainingTab />);
    await user.click(plainSave());
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = (updateMock.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect('program_id' in payload).toBe(false);
    expect('days_per_week' in payload).toBe(false);
    expect(restartProgram).not.toHaveBeenCalled();
  });

  it('clears the stored week index when a meet date is added or removed, but not when it is only changed', async () => {
    const user = userEvent.setup();

    // Added: a manual user with a stored position gets a meet-date plan.
    profile = { ...profile, meet_date: null, current_week_index: 7 };
    const added = render(<TrainingTab />);
    await user.type(screen.getByLabelText(/Meet \/ 1RM Test Date/), '2027-04-14');
    await user.click(plainSave());
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect((updateMock.mock.calls[0] as unknown as [Record<string, unknown>])[0]).toMatchObject({ meet_date: '2027-04-14', current_week_index: null });
    added.unmount();

    // Removed: back to the repeating plan.
    updateMock.mockClear();
    profile = { ...profile, meet_date: '2027-04-14', current_week_index: 7 };
    const removed = render(<TrainingTab />);
    await user.clear(screen.getByLabelText(/Meet \/ 1RM Test Date/));
    await user.click(plainSave());
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect((updateMock.mock.calls[0] as unknown as [Record<string, unknown>])[0]).toMatchObject({ meet_date: null, current_week_index: null });
    removed.unmount();

    // Only changed: the position stays put.
    updateMock.mockClear();
    profile = { ...profile, meet_date: '2027-04-14', current_week_index: 7 };
    render(<TrainingTab />);
    await user.clear(screen.getByLabelText(/Meet \/ 1RM Test Date/));
    await user.type(screen.getByLabelText(/Meet \/ 1RM Test Date/), '2027-05-12');
    await user.click(plainSave());
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect('current_week_index' in (updateMock.mock.calls[0] as unknown as [Record<string, unknown>])[0]).toBe(false);
  });
});

