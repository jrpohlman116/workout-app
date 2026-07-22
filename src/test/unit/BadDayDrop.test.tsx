import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainLiftView from '../../pages/WorkoutDetail/views/MainLiftView';

const baseProps = {
  liftName: 'Deadlift',
  mainSets: [
    { reps: '10', weight: '180' },
    { reps: '10', weight: '180' },
  ],
  mainReps: 10,
  unitPreference: 'lb',
  lastSetData: '',
  phase: 'accumulation' as const,
  baseWeight: 180,
  onUpdateSet: () => {},
  onNext: () => {},
  nextExerciseName: 'Pin Squats',
};

describe('bad-day weight reduction (MainLiftView)', () => {
  it('lives in the warm-up card as a collapsed disclosure', () => {
    render(<MainLiftView {...baseProps} onBadDayDrop={() => {}} />);
    const trigger = screen.getByRole('button', { name: /rough day\? drop the weight/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'bad-day-options');
    // Options hidden until disclosed
    expect(screen.queryByRole('button', { name: /drop weights 10 percent/i })).not.toBeInTheDocument();
    // Rendered inside the warm-up card, alongside the feel flow
    const warmupCard = screen.getByText('Warm-up Progression').closest('div');
    expect(warmupCard).toContainElement(trigger);
  });

  it('expands with correct ARIA state and offers percentage drops', async () => {
    const user = userEvent.setup();
    const onBadDayDrop = vi.fn();
    render(<MainLiftView {...baseProps} onBadDayDrop={onBadDayDrop} />);

    const trigger = screen.getByRole('button', { name: /rough day\? drop the weight/i });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /drop weights 20 percent/i }));
    expect(onBadDayDrop).toHaveBeenCalledWith(0.20);
  });

  it('collapses again when the trigger is toggled', async () => {
    const user = userEvent.setup();
    render(<MainLiftView {...baseProps} onBadDayDrop={() => {}} />);

    const trigger = screen.getByRole('button', { name: /rough day\? drop the weight/i });
    await user.click(trigger);
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /drop weights 10 percent/i })).not.toBeInTheDocument();
  });

  it('announces an applied drop via a polite live region and offers a further drop', () => {
    render(<MainLiftView {...baseProps} onBadDayDrop={() => {}} badDayDrop={0.10} />);
    const notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('aria-live', 'polite');
    expect(notice).toHaveTextContent(/weights reduced 10% for your remaining sets/i);
    expect(screen.getByRole('button', { name: /drop the weight further/i })).toBeInTheDocument();
  });

  it('renders no affordance when the handler is absent (e.g. upper day)', () => {
    render(<MainLiftView {...baseProps} />);
    expect(screen.queryByRole('button', { name: /rough day/i })).not.toBeInTheDocument();
  });
});
