import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkingSetModal from '../../components/features/WorkingSetModal';
import MainLiftView from '../../pages/WorkoutDetail/views/MainLiftView';
import { DEFAULT_PLATES_LB } from '../../lib/calculations';

const modalProps = (overrides: Record<string, unknown> = {}) => ({
  setNumber: 2,
  totalSets: 5,
  initialReps: '10',
  initialWeight: '180',
  repsTarget: '10',
  isAmap: false,
  unit: 'lb',
  availablePlates: DEFAULT_PLATES_LB,
  onSave: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('WorkingSetModal', () => {
  it('opens as a dialog with plate visual and prefilled steppers', () => {
    render(<WorkingSetModal {...modalProps()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Set 2 of 5')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(/load per side/i);
    expect(screen.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(180);
    expect(screen.getByRole('spinbutton', { name: 'Reps' })).toHaveValue(10);
  });

  it('steps weight by the plate increment and reps by one', async () => {
    const user = userEvent.setup();
    render(<WorkingSetModal {...modalProps()} />);

    await user.click(screen.getByRole('button', { name: 'Decrease weight' }));
    expect(screen.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(175);

    await user.click(screen.getByRole('button', { name: 'Increase reps' }));
    expect(screen.getByRole('spinbutton', { name: 'Reps' })).toHaveValue(11);
  });

  it('steps by 2.5 in kg mode', async () => {
    const user = userEvent.setup();
    render(<WorkingSetModal {...modalProps({ unit: 'kg', initialWeight: '100', availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25] })} />);
    await user.click(screen.getByRole('button', { name: 'Increase weight' }));
    expect(screen.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(102.5);
  });

  it('saves the edited values', async () => {
    const user = userEvent.setup();
    const props = modalProps();
    render(<WorkingSetModal {...props} />);

    await user.click(screen.getByRole('button', { name: 'Decrease weight' }));
    await user.click(screen.getByRole('button', { name: 'Decrease reps' }));
    await user.click(screen.getByRole('button', { name: 'Log Set' }));
    expect(props.onSave).toHaveBeenCalledWith('9', '175');
  });

  it('frames AMAP sets correctly', () => {
    render(<WorkingSetModal {...modalProps({ isAmap: true, repsTarget: '10+' })} />);
    expect(screen.getByText(/AMAP set — target 10\+\. Log every rep you got\./)).toBeInTheDocument();
  });
});

describe('MainLiftView focused set rows', () => {
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
    setChecks: [false, false],
    onToggleSetCheck: vi.fn(),
    onUpdateSet: vi.fn(),
    onUpdateSetValues: vi.fn(),
    onNext: () => {},
    nextExerciseName: 'Pin Squats',
  };

  it('renders sets as rows with check chip, prescription text, and a Log button', () => {
    render(<MainLiftView {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Mark set 1 done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log set 1' })).toBeInTheDocument();
    // No inline inputs on the main lift anymore
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('logging a set commits values atomically and checks it off', async () => {
    const user = userEvent.setup();
    render(<MainLiftView {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Log set 1' }));
    await user.click(screen.getByRole('button', { name: 'Increase weight' }));
    await user.click(screen.getByRole('button', { name: 'Log Set' }));

    expect(baseProps.onUpdateSetValues).toHaveBeenCalledWith(0, '10', '185');
    expect(baseProps.onToggleSetCheck).toHaveBeenCalledWith(0);
  });
});
