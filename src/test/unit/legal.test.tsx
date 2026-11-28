import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppFooter from '../../components/layout/AppFooter';
import LegalPage from '../../pages/Legal';

describe('legal pages', () => {
  it('the footer links to both, as real links', async () => {
    const onNavigate = vi.fn();
    render(<AppFooter onNavigate={onNavigate} />);
    const privacy = screen.getByRole('link', { name: 'Privacy policy' });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
    await userEvent.click(privacy);
    expect(onNavigate).toHaveBeenCalledWith('privacy');
  });

  it('the privacy policy covers Oura and Strava data, storage, disconnecting and deletion', () => {
    render(<LegalPage page="privacy" onBack={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    for (const words of ['Oura', 'Strava', 'Supabase', 'Disconnect a service', 'Delete your account']) expect(text).toContain(words);
  });

  it('the terms say it is not medical advice', () => {
    render(<LegalPage page="terms" onBack={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of service' })).toBeInTheDocument();
    expect(document.body.textContent).toContain("isn't medical advice");
  });
  it('both pages list the contact email', () => {
    for (const page of ['privacy', 'terms'] as const) {
      const { unmount } = render(<LegalPage page={page} onBack={() => {}} />);
      expect(screen.getByRole('link', { name: 'martinuzzijordan@gmail.com' })).toHaveAttribute('href', 'mailto:martinuzzijordan@gmail.com');
      unmount();
    }
  });
});
