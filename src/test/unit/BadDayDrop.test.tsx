import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainLiftView from '../../pages/WorkoutDetail/views/MainLiftView';
import WarmupFlow from '../../components/features/WarmupFlow';
import { calculateWarmupSets, DEFAULT_PLATES_LB } from '../../lib/calculations';

const finalStepProps = (overrides: Record<string, unknown> = {}) => ({
  warmup: calculateWarmupSets(180, 'lb'),
  plannedWeight: 180,
  adjustedWeight: 185,
  currentTopWeight: 185,
  unit: 'lb',
  availablePlates: DEFAULT_PLATES_LB,
  warmupChecks: [true, true, true, true],
  set4Feel: 'good' as const,
  set5Feel: 'easy' as const,
  badDayDrop: 0,
  onBadDayDrop: vi.fn(),
  onCheckSet: vi.fn(),
  onSet4Feel: vi.fn(),
  onSet5Feel: vi.fn(),
  onComplete: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('bad-day weight reduction (warm-up flow final card)', () => {
  it('offers the collapsed disclosure before starting working sets', () => {
    render(<WarmupFlow {...finalStepProps()} />);
    const trigger = screen.getByRole('button', { name: /rough day\? drop the weight/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'bad-day-options');
    // Sits on the same card as the handoff button
    expect(screen.getByRole('button', { name: /start working sets/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /drop weights 10 percent/i })).not.toBeInTheDocument();
  });

  it('expands with correct ARIA state and offers percentage drops', async () => {
    const user = userEvent.setup();
    const props = finalStepProps();
    render(<WarmupFlow {...props} />);

    const trigger = screen.getByRole('button', { name: /rough day\? drop the weight/i });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: /drop weights 20 percent/i }));
    expect(props.onBadDayDrop).toHaveBeenCalledWith(0.20);
  });

  it('shows the applied notice, the live dropped weight, and a further-drop trigger', () => {
    render(<WarmupFlow {...finalStepProps({ badDayDrop: 0.10, currentTopWeight: 165 })} />);
    const notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('aria-live', 'polite');
    expect(notice).toHaveTextContent(/weights reduced 10% for your remaining sets/i);
    // Final card reflects the actual (dropped) top weight, and the
    // now-contradictory feel-adjustment note is suppressed
    expect(screen.getByText('165')).toBeInTheDocument();
    expect(screen.queryByText(/adjusted for today/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /drop the weight further/i })).toBeInTheDocument();
  });

  it('no longer renders the CTA on the main view — only a quiet applied note', () => {
    render(
      <MainLiftView
        liftName="Deadlift"
        mainSets={[{ reps: '10', weight: '162' }]}
        mainReps={10}
        unitPreference="lb"
        lastSetData=""
        phase="accumulation"
        baseWeight={180}
        badDayDrop={0.10}
        onBadDayDrop={() => {}}
        onUpdateSet={() => {}}
        onNext={() => {}}
        nextExerciseName="Pin Squats"
      />
    );
    expect(screen.queryByRole('button', { name: /rough day/i })).not.toBeInTheDocument();
    expect(screen.getByText(/weights reduced 10% for today/i)).toBeInTheDocument();
  });
});
