import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import RestTimer from '../../components/features/RestTimer';

describe('RestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderTimer = (overrides: Partial<Parameters<typeof RestTimer>[0]> = {}) => {
    const props = {
      endsAt: Date.now() + 90_000,
      totalSeconds: 90,
      onExtend: vi.fn(),
      onDismiss: vi.fn(),
      ...overrides,
    };
    render(<RestTimer {...props} />);
    return props;
  };

  it('shows the remaining time derived from the end timestamp', () => {
    renderTimer();
    expect(screen.getByText('1:30')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('stays correct after time passes while un-ticked (backgrounded)', () => {
    renderTimer();
    // Jump the clock without relying on interval ticks accumulating
    act(() => {
      vi.setSystemTime(new Date('2026-07-20T12:01:00Z'));
      vi.advanceTimersByTime(500); // single tick after "waking up"
    });
    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('offers one-tap extend', async () => {
    const props = renderTimer();
    const extend = screen.getByRole('button', { name: 'Add 30 seconds of rest' });
    act(() => { extend.click(); });
    expect(props.onExtend).toHaveBeenCalledWith(30);
  });

  it('offers one-tap skip while running', () => {
    const props = renderTimer();
    act(() => { screen.getByRole('button', { name: 'Skip rest' }).click(); });
    expect(props.onDismiss).toHaveBeenCalledOnce();
  });

  it('announces completion and auto-dismisses shortly after', () => {
    const props = renderTimer({ endsAt: Date.now() + 2_000, totalSeconds: 90 });
    act(() => { vi.advanceTimersByTime(2_500); });
    expect(screen.getByRole('status')).toHaveTextContent('Rest over — go!');
    expect(props.onDismiss).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(6_000); });
    expect(props.onDismiss).toHaveBeenCalled();
  });

  it('does not vibrate by default (silent)', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    renderTimer({ endsAt: Date.now() + 1_000 });
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(vibrate).not.toHaveBeenCalled();
  });
});
