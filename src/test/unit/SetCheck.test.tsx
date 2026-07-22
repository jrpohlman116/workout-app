import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetCheck from '../../components/ui/SetCheck';
import AccessibleFormGroup from '../../components/accessible/AccessibleFormGroup';

describe('SetCheck', () => {
  it('exposes state via aria-pressed and toggles on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SetCheck checked={false} label="Mark set 1 done" display="1" onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Mark set 1 done' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('1');

    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('marks done state with an icon, not color alone', () => {
    render(<SetCheck checked={true} label="Set 2 done — tap to undo" display="2" onToggle={() => {}} />);
    const button = screen.getByRole('button', { name: 'Set 2 done — tap to undo' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    // The set number is replaced by the check icon (an svg) when done
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button).not.toHaveTextContent('2');
  });
});

describe('AccessibleFormGroup set check-offs', () => {
  const sets = [
    { reps: '10', weight: '135' },
    { reps: '10', weight: '135' },
  ];
  const noop = () => {};

  it('renders a check toggle per set when a toggle handler is provided', async () => {
    const user = userEvent.setup();
    const onToggleSetCheck = vi.fn();
    render(
      <AccessibleFormGroup
        legend="Barbell Squat"
        sets={sets}
        onUpdateSet={noop}
        onAddSet={noop}
        onRemoveSet={noop}
        setChecks={[true, false]}
        onToggleSetCheck={onToggleSetCheck}
      />
    );

    expect(screen.getByRole('button', { name: 'Set 1 done — tap to undo' })).toHaveAttribute('aria-pressed', 'true');
    const second = screen.getByRole('button', { name: 'Mark set 2 done' });
    expect(second).toHaveAttribute('aria-pressed', 'false');

    await user.click(second);
    expect(onToggleSetCheck).toHaveBeenCalledWith(1);
  });

  it('renders the plain set-number chip when no toggle handler is provided', () => {
    render(
      <AccessibleFormGroup
        legend="Barbell Squat"
        sets={sets}
        onUpdateSet={noop}
        onAddSet={noop}
        onRemoveSet={noop}
      />
    );
    expect(screen.queryByRole('button', { name: /mark set/i })).not.toBeInTheDocument();
  });

  it('never gates the inputs on check state', () => {
    render(
      <AccessibleFormGroup
        legend="Barbell Squat"
        sets={sets}
        onUpdateSet={noop}
        onAddSet={noop}
        onRemoveSet={noop}
        setChecks={[false, false]}
        onToggleSetCheck={noop}
      />
    );
    // All reps/weight inputs remain enabled regardless of check state
    screen.getAllByRole('spinbutton').forEach(input => expect(input).toBeEnabled());
  });
});
