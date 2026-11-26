import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgramPicker from '../../components/features/ProgramPicker';
import type { DaysPerWeek, ProgramId } from '../../lib/programs/types';

function setup(programId: ProgramId = 'juggernaut', daysPerWeek: DaysPerWeek = 4) {
  const onChange = vi.fn();
  const utils = render(<ProgramPicker programId={programId} daysPerWeek={daysPerWeek} onChange={onChange} />);
  const days = () => screen.getByRole('radiogroup', { name: 'Days per week' });
  const programs = () => screen.getByRole('radiogroup', { name: 'Program' });
  return { onChange, days, programs, ...utils };
}

describe('ProgramPicker', () => {
  it('lists the registered programs and the supported day counts', () => {
    const { days, programs } = setup();
    expect(within(programs()).getAllByRole('radio').map(r => r.textContent)).toEqual([
      expect.stringContaining('Juggernaut'),
      expect.stringContaining('5/3/1'),
    ]);
    expect(within(days()).getAllByRole('radio')).toHaveLength(2);
  });

  it('marks the current choice checked and gives each group a single tab stop on it', () => {
    const { days, programs } = setup('five_three_one', 3);
    for (const group of [days(), programs()]) {
      const radios = within(group).getAllByRole('radio');
      expect(radios.filter(r => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
      expect(radios.filter(r => r.tabIndex === 0)).toHaveLength(1);
      expect(radios.find(r => r.tabIndex === 0)).toBe(radios.find(r => r.getAttribute('aria-checked') === 'true'));
    }
    expect(within(days()).getByRole('radio', { name: /3 days/ })).toBeChecked();
    expect(within(programs()).getByRole('radio', { name: /5\/3\/1/ })).toBeChecked();
  });

  it('reports a click', async () => {
    const user = userEvent.setup();
    const { days, onChange } = setup('juggernaut', 4);
    await user.click(within(days()).getByRole('radio', { name: /3 days/ }));
    expect(onChange).toHaveBeenCalledWith({ programId: 'juggernaut', daysPerWeek: 3 });
  });

  it('keeps the days when switching to a program that supports them', async () => {
    const user = userEvent.setup();
    const { programs, onChange } = setup('juggernaut', 3);
    await user.click(within(programs()).getByRole('radio', { name: /5\/3\/1/ }));
    expect(onChange).toHaveBeenCalledWith({ programId: 'five_three_one', daysPerWeek: 3 });
  });
});

describe('ProgramPicker keyboard', () => {
  it('tabs into a group on the selected option only', async () => {
    const user = userEvent.setup();
    const { days } = setup('juggernaut', 4);
    await user.tab();
    expect(within(days()).getByRole('radio', { name: /4 days/ })).toHaveFocus();
  });

  it('arrow keys move focus and select, wrapping at the ends', async () => {
    const user = userEvent.setup();
    const { days, onChange } = setup('juggernaut', 3);
    await user.tab();
    expect(within(days()).getByRole('radio', { name: /3 days/ })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'juggernaut', daysPerWeek: 4 });
    expect(within(days()).getByRole('radio', { name: /4 days/ })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'juggernaut', daysPerWeek: 3 });
  });

  it('left and up go back, right and down go forward', async () => {
    const user = userEvent.setup();
    const { days, onChange } = setup('juggernaut', 4);
    await user.tab();
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'juggernaut', daysPerWeek: 3 });
    expect(within(days()).getByRole('radio', { name: /3 days/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'juggernaut', daysPerWeek: 4 });
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'juggernaut', daysPerWeek: 3 });
  });

  it('Home and End jump to the first and last option', async () => {
    const user = userEvent.setup();
    const { programs, onChange } = setup('juggernaut', 4);
    // Tab past the days group to the program group.
    await user.tab();
    await user.tab();
    expect(within(programs()).getByRole('radio', { name: /Juggernaut/ })).toHaveFocus();

    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'five_three_one', daysPerWeek: 4 });
    expect(within(programs()).getByRole('radio', { name: /5\/3\/1/ })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith({ programId: 'juggernaut', daysPerWeek: 4 });
  });
});
