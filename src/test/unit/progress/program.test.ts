import { describe, it, expect } from 'vitest';
import { getProgram } from '../../../lib/programs/registry';
import { changeLabel, tmBars, tmSummary, waveRows } from '../../../lib/progress/program';
import { parseRoute, routeToPath } from '../../../lib/routes';
import type { TrainingMaxChange } from '../../../lib/supabase';
import type { WeekBlock } from '../../../lib/programs/types';

const program = getProgram('five_three_one');
const PLATES = [45, 35, 25, 10, 5, 2.5];
const weeks: WeekBlock[] = (['accumulation', 'intensification', 'realization', 'deload'] as const).map((phase, i) => ({
  phase, weekIndex: i, cycleIndex: 0, startDate: new Date(2026, 10, 2 + i * 7), endDate: new Date(2026, 10, 8 + i * 7),
}));

const change = (over: Partial<TrainingMaxChange>): TrainingMaxChange => ({
  id: 'x', user_id: 'u', lift: 'squat', old_tm: null, new_tm: 210, reason: 'start', amrap_weight: null, amrap_reps: null,
  e1rm: null, explanation: null, cycle_index: null, created_at: '2026-08-01T12:00:00Z', ...over,
});
const history = [
  change({}),
  change({ old_tm: 210, new_tm: 220, reason: 'increase', amrap_weight: 180, amrap_reps: 6, created_at: '2026-09-01T12:00:00Z' }),
  change({ old_tm: 220, new_tm: 230, reason: 'increase', amrap_weight: 195, amrap_reps: 5, created_at: '2026-10-01T12:00:00Z' }),
  change({ old_tm: 230, new_tm: 240, reason: 'increase', amrap_weight: 205, amrap_reps: 5, created_at: '2026-11-01T12:00:00Z' }),
];

describe('this wave', () => {
  it('lists the four weeks with loads, done and current', () => {
    const rows = waveRows({ program, weeks, current: weeks[1], lift: 'squat', trainingMax: 240, unit: 'lb', plates: PLATES });
    expect(rows.map(r => [r.label, r.scheme, r.top, r.backoff, r.state])).toEqual([
      ['Accumulation', '5 @ 75%', '180 × 5', 'Back-offs 160 × 5', 'done'],
      ['Intensification', '3 @ 85%', '205 × 3', 'Back-offs 185 × 3', 'current'],
      ['Realization', 'AMRAP @ 90%', '215 × 3+', 'Back-offs 180 × 3', 'upcoming'],
      ['Deload', '3 @ 65%', '155 × 3', 'Back-offs 145 × 3', 'upcoming'],
    ]);
  });
});

describe('training max history', () => {
  it('summarizes start, change since start and the last change', () => {
    const s = tmSummary(history, 240, 'squat', 'lb');
    expect(s.startedAt).toEqual({ value: 210, month: 'Aug' });
    expect(s.changeSinceStart).toBe('+30 lb over 3 waves');
    expect(s.lastChange).toBe('+10 lb · after 205 × 5 AMRAP');
    expect(s.history[0]).toEqual({ title: 'Nov · 240 lb', detail: '+10 · fixed increment' });
    expect(s.history[3]).toEqual({ title: 'Aug · 210 lb', detail: 'Starting training max' });
  });

  it('labels each kind of change', () => {
    expect(changeLabel(change({ old_tm: 240, new_tm: 252, reason: 'increase' }), 'squat', 'lb')).toBe('+12 · from your AMRAP');
    expect(changeLabel(change({ old_tm: 240, new_tm: 240, reason: 'hold' }), 'squat', 'lb')).toBe('Held · missed the AMRAP minimum');
    expect(changeLabel(change({ old_tm: 240, new_tm: 227.5, reason: 'decrease' }), 'squat', 'lb')).toBe('−12.5 · dropped 5%');
  });

  it('charts the last changes plus a dashed next-wave bar', () => {
    expect(tmBars(history, 250)).toEqual([
      { label: 'Aug', value: 210 }, { label: 'Sep', value: 220 }, { label: 'Oct', value: 230 }, { label: 'Nov', value: 240 },
      { label: 'Next', value: 250, next: true },
    ]);
  });
});

describe('progress routes', () => {
  it('carries the lift and the training max sheet', () => {
    expect(parseRoute('/progress/program', '?lift=bench&sheet=tm')).toEqual({ tab: 'progress', sub: 'program', lift: 'bench', sheet: 'tm' });
    expect(routeToPath({ tab: 'progress', sub: 'program', lift: 'bench', sheet: 'tm' })).toBe('/progress/program?lift=bench&sheet=tm');
    expect(routeToPath({ tab: 'progress', sub: 'log' })).toBe('/progress/log');
  });
});
