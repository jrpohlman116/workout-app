import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpdateToast from '../../components/features/UpdateToast';
import { SW_UPDATE_EVENT } from '../../lib/constants';

const fireUpdateEvent = () => {
  act(() => {
    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
  });
};

describe('UpdateToast', () => {
  it('renders nothing until an update event fires', () => {
    render(<UpdateToast />);
    expect(screen.queryByText('Update available')).not.toBeInTheDocument();
  });

  it('shows the toast when the service worker reports an update', () => {
    render(<UpdateToast />);
    fireUpdateEvent();
    expect(screen.getByText('Update available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh now/i })).toBeInTheDocument();
  });

  it('is dismissible and stays dismissed', async () => {
    const user = userEvent.setup();
    render(<UpdateToast />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: /dismiss update notice/i }));
    expect(screen.queryByText('Update available')).not.toBeInTheDocument();

    // A repeat event for the same session doesn't resurrect a dismissed toast
    fireUpdateEvent();
    expect(screen.queryByText('Update available')).not.toBeInTheDocument();
  });

  it('announces politely and never blocks the page', () => {
    render(<UpdateToast />);
    fireUpdateEvent();
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });
});
