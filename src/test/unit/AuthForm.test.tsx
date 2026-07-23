import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from '../../components/features/AuthForm';

const resetPasswordForEmail = vi.fn(() => Promise.resolve({ error: null }));
const signInWithPassword = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

describe('AuthForm — forgot password', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockClear();
    signInWithPassword.mockClear();
  });

  it('shows a "Forgot password?" link on the login tab only', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument();
  });

  it('switches to a reset form and sends a reset email pointing back at this origin', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Reset your password')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jordan@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'jordan@example.com',
      { redirectTo: window.location.origin }
    ));
  });

  it('shows a generic confirmation that does not reveal whether the account exists', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText('Forgot password?'));
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jordan@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(screen.getByText('Check your email')).toBeInTheDocument());
    expect(screen.getByText(/If an account exists for/)).toBeInTheDocument();
  });

  it('returns to the login form via "Back to log in"', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText('Forgot password?'));
    await user.click(screen.getByRole('button', { name: 'Back to log in' }));

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.queryByText('Reset your password')).not.toBeInTheDocument();
  });
});
