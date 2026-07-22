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
  it('is collapsed behind a low-key affordance by default', () => {
    render(<MainLiftView {...baseProps} onBadDayDrop={() => {}} />);
    expect(screen.getByRole('button', { name: /rough day\? drop the weight/i })).toBeInTheDocument();
    expect(screen.queryByText(/−10%/)).not.toBeInTheDocument();
  });

  it('offers one-tap percentage drops, not flat increments', async () => {
    const user = userEvent.setup();
    const onBadDayDrop = vi.fn();
    render(<MainLiftView {...baseProps} onBadDayDrop={onBadDayDrop} />);

    await user.click(screen.getByRole('button', { name: /rough day\? drop the weight/i }));
    await user.click(screen.getByRole('button', { name: /−20% · very rough/i }));
    expect(onBadDayDrop).toHaveBeenCalledWith(0.20);
  });

  it('confirms an applied drop with supportive framing and offers a further drop', () => {
    render(<MainLiftView {...baseProps} onBadDayDrop={() => {}} badDayDrop={0.10} />);
    expect(screen.getByText(/weights reduced 10% for your remaining sets/i)).toBeInTheDocument();
    expect(screen.getByText(/smart call/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /drop the weight further/i })).toBeInTheDocument();
  });

  it('renders no affordance when the handler is absent (e.g. upper day)', () => {
    render(<MainLiftView {...baseProps} />);
    expect(screen.queryByRole('button', { name: /rough day/i })).not.toBeInTheDocument();
  });
});
