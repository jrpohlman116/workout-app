import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarmupFlow from '../../components/features/WarmupFlow';
import PlateVisual from '../../components/features/PlateVisual';
import { calculateWarmupSets, DEFAULT_PLATES_LB } from '../../lib/calculations';

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  warmup: calculateWarmupSets(165, 'lb'),
  plannedWeight: 165,
  adjustedWeight: null,
  unit: 'lb',
  availablePlates: DEFAULT_PLATES_LB,
  warmupChecks: [] as boolean[],
  set4Feel: null,
  set5Feel: null,
  onCheckSet: vi.fn(),
  onSet4Feel: vi.fn(),
  onSet5Feel: vi.fn(),
  onComplete: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('WarmupFlow', () => {
  it('opens as a dialog on the first set (empty bar)', () => {
    render(<WarmupFlow {...makeProps()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/set 1 of 4 — empty bar/i)).toBeInTheDocument();
  });

  it('steps through sets, checking each one off', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<WarmupFlow {...props} />);

    await user.click(screen.getByRole('button', { name: /done — next set/i }));
    expect(props.onCheckSet).toHaveBeenCalledWith(0);
    expect(screen.getByText(/set 2 of 4 — 50%/i)).toBeInTheDocument();
  });

  it('asks for feel on the 82% set and advances to the approach single', async () => {
    const user = userEvent.setup();
    const props = makeProps({ warmupChecks: [true, true, true] });
    render(<WarmupFlow {...props} />);

    // Resumes at the 82% step
    expect(screen.getByText(/set 4 of 4 — 82%/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(props.onCheckSet).toHaveBeenCalledWith(3);
    expect(props.onSet4Feel).toHaveBeenCalledWith('good');
  });

  it('rates the approach single and lands on the final card', async () => {
    const user = userEvent.setup();
    const props = makeProps({ warmupChecks: [true, true, true, true], set4Feel: 'good' });
    render(<WarmupFlow {...props} />);

    expect(screen.getByText(/approach single/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Easy' }));
    expect(props.onSet5Feel).toHaveBeenCalledWith('easy');
    expect(screen.getByRole('button', { name: /start working sets/i })).toBeInTheDocument();
  });

  it('shows the adjusted working weight on the final card and completes', async () => {
    const user = userEvent.setup();
    const props = makeProps({
      warmupChecks: [true, true, true, true],
      set4Feel: 'good',
      set5Feel: 'easy',
      adjustedWeight: 170,
    });
    render(<WarmupFlow {...props} />);

    expect(screen.getByText(/your working weight/i)).toBeInTheDocument();
    expect(screen.getByText(/adjusted for today/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /start working sets/i }));
    expect(props.onComplete).toHaveBeenCalledOnce();
  });

  it('skipping the 82% feel skips the approach single too', async () => {
    const user = userEvent.setup();
    const props = makeProps({ warmupChecks: [true, true, true] });
    render(<WarmupFlow {...props} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    // No feel given — no approach; planned weight stands
    expect(screen.getByText(/planned working weight/i)).toBeInTheDocument();
  });
});

describe('PlateVisual', () => {
  it('describes the load as a single accessible image', () => {
    render(<PlateVisual targetWeight={180} barWeight={45} availablePlates={DEFAULT_PLATES_LB} unit="lb" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAccessibleName('Load per side: 45 · 10×2 · 2.5. 45 lb bar plus 135 lb in plates.');
  });

  it('shows the empty bar for bar-only weights', () => {
    render(<PlateVisual targetWeight={45} barWeight={45} availablePlates={DEFAULT_PLATES_LB} unit="lb" />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Empty bar — 45 lb.');
  });

  it('notes the nearest loadable weight when the target is unreachable', () => {
    render(<PlateVisual targetWeight={180} barWeight={45} availablePlates={[45, 25, 10, 5]} unit="lb" />);
    expect(screen.getByText(/nearest loadable: 175 lb/i)).toBeInTheDocument();
  });
});
