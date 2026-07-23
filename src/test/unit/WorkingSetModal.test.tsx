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

  it('hides the Add Set affordance when onAddSet is not provided', () => {
    render(<MainLiftView {...baseProps} />);
    expect(screen.queryByRole('button', { name: /add set|add another set/i })).not.toBeInTheDocument();
  });

  it('shows Add Set when onAddSet is provided and calls it on tap', async () => {
    const user = userEvent.setup();
    const onAddSet = vi.fn();
    render(<MainLiftView {...baseProps} onAddSet={onAddSet} />);

    const addButton = screen.getByRole('button', { name: /add another set \(2 of 10 sets used\)/i });
    await user.click(addButton);
    expect(onAddSet).toHaveBeenCalledOnce();
  });

  it('swaps to a "Max 10 sets" message instead of the button once at the cap', () => {
    const tenSets = Array.from({ length: 10 }, () => ({ reps: '10', weight: '180' }));
    render(<MainLiftView {...baseProps} mainSets={tenSets} setChecks={new Array(10).fill(false)} onAddSet={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /add another set/i })).not.toBeInTheDocument();
    expect(screen.getByText('Max 10 sets')).toBeInTheDocument();
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

  // The row weight paragraph mixes a text node with a nested <span> for the
  // unit, so RTL's getByText (which only concatenates direct text-node
  // children) can't match the range as one string — assert on the row
  // elements' full textContent instead.
  const getWeightRows = () => screen.getAllByText(
    (_, element) => element?.tagName === 'P' && !!element.classList.contains('font-bold')
  );

  it('shows a ±4% range per row (not the exact prescribed weight) before the warm-up is done', () => {
    render(<MainLiftView {...baseProps} />);
    // 180 * 0.96 = 172.8 -> 175, 180 * 1.04 = 187.2 -> 185 (rounded to nearest 5)
    const rows = getWeightRows();
    expect(rows).toHaveLength(2);
    rows.forEach(row => {
      expect(row.textContent).toContain('175–185');
      expect(row.textContent).not.toMatch(/\b180\b/);
    });
  });

  it('locks to the exact weight once the warm-up flow completes', async () => {
    const user = userEvent.setup();
    render(<MainLiftView {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /start warm-up/i }));
    // Skip through every fixed set without rating feel, landing on the final card
    for (let i = 0; i < 4; i++) {
      const skip = screen.queryByRole('button', { name: 'Skip' });
      if (skip) await user.click(skip);
    }
    await user.click(screen.getByRole('button', { name: /start working sets/i }));

    const rows = getWeightRows();
    rows.forEach(row => {
      expect(row.textContent).not.toContain('–');
      expect(row.textContent).toContain('180');
    });
  });

  it('shows the real logged weight for a checked set even while the range is still active for others', () => {
    render(<MainLiftView {...baseProps} mainSets={[{ reps: '10', weight: '175' }, { reps: '10', weight: '180' }]} setChecks={[true, false]} />);
    const [checkedRow, uncheckedRow] = getWeightRows();
    expect(checkedRow.textContent).not.toContain('–');
    expect(checkedRow.textContent).toContain('175');
    expect(uncheckedRow.textContent).toContain('175–185'); // unlogged set: still ranged off its own 180 target
  });
});
