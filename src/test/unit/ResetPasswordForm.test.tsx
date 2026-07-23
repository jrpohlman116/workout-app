import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordForm from '../../components/features/ResetPasswordForm';

const updateUser = vi.fn(() => Promise.resolve({ error: null }));
const clearPasswordRecovery = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => updateUser(...args),
    },
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ clearPasswordRecovery }),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    updateUser.mockClear();
    clearPasswordRecovery.mockClear();
  });

  it('rejects mismatched passwords without calling updateUser', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword2');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('sets the new password and clears recovery mode on success', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: 'newpassword1' }));
    expect(clearPasswordRecovery).toHaveBeenCalledOnce();
  });

  it('does not clear recovery mode when the update fails', async () => {
    updateUser.mockResolvedValueOnce({ error: new Error('Password should be at least 6 characters') });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText('New password'), 'newpassword1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));

    await waitFor(() => expect(screen.getByText(/at least 6 characters/)).toBeInTheDocument());
    expect(clearPasswordRecovery).not.toHaveBeenCalled();
  });
});
