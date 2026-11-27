import { describe, it, expect } from 'vitest';
import { getProgram } from '../../../lib/programs/registry';
import { weekRows } from '../../../lib/programs/week';
import { readinessHeadline } from '../../../lib/today/copy';
import type { WeekBlock } from '../../../lib/programs/types';

const program = getProgram('five_three_one');
const layout = program.layout(3);
const block: WeekBlock = { phase: 'intensification', weekIndex: 1, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1) };
const maxes = { squat: 240, bench: 147.5, deadlift: 255 };
const PLATES = [45, 35, 25, 10, 5, 2.5];

describe('this week', () => {
  it('numbers the days, marks done and today, and shows exact top-set loads', () => {
    const rows = weekRows({
      layout, program, block, trainingMaxes: maxes, unit: 'lb', plates: PLATES,
      done: new Map([['squat', '2026-11-23T18:00:00']]), isCurrentWeek: true,
    });
    expect(rows.map(r => [r.number, r.label, r.state, r.weight])).toEqual([
      ['01', 'Squat', 'done', 205],
      ['02', 'Bench', 'today', 125],
      ['03', 'Deadlift', 'upcoming', 215],
    ]);
    expect(rows[0].doneOn).toBe('Mon');
  });

  it('another week has no today', () => {
    const rows = weekRows({ layout, program, block, trainingMaxes: maxes, unit: 'lb', done: new Map(), isCurrentWeek: false });
    expect(rows.every(r => r.state === 'upcoming')).toBe(true);
  });

  it('a lift with no max asks for one', () => {
    const rows = weekRows({ layout: program.layout(4), program, block, trainingMaxes: maxes, unit: 'lb', done: new Map(), isCurrentWeek: true });
    expect(rows.find(r => r.dayId === 'ohp')).toMatchObject({ needsMax: true, weight: null });
  });

  it('headlines each readiness state', () => {
    expect([readinessHeadline('green'), readinessHeadline('yellow'), readinessHeadline('red')])
      .toEqual(['Train as written', 'Lighter day', 'Recovery day']);
  });
});
