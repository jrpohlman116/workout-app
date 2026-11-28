import { describe, it, expect } from 'vitest';
import { getProgram } from '../../../lib/programs/registry';
import { nextTrainingMax } from '../../../lib/programs/fiveThreeOne/engine';
import { nextBackoffAdjustment, backoffStateFromHistory } from '../../../lib/programs/backoffs';
import { trainingMaxFromOneRepMax } from '../../../lib/programs/maxes';
import { calculateWarmupSets } from '../../../lib/calculations';
import type { LiftId, SessionSummary, WeekBlock } from '../../../lib/programs/types';

// "Numbers to test against" from the UX overhaul handoff (2026-11-27).
// Fixture: 1RMs 265 / 165 / 285 -> training maxes 240 / 147.5 / 255. Bar 45 lb.

const program = getProgram('five_three_one');
const PHASES = ['accumulation', 'intensification', 'realization', 'deload'] as const;
const block = (phase: WeekBlock['phase']): WeekBlock => ({
  phase, weekIndex: 0, cycleIndex: 0, startDate: new Date(0), endDate: new Date(1),
});
const rx = (lift: LiftId, tm: number, phase: WeekBlock['phase']) =>
  program.prescribe({ block: block(phase), lift, trainingMax: tm, unit: 'lb' }).groups;
const pair = (lift: LiftId, tm: number, phase: WeekBlock['phase']) => {
  const [top, back] = rx(lift, tm, phase);
  return `${top.weight}x${top.reps}${top.isAmrap ? '+' : ''} / ${back.weight}x${back.reps}`;
};

describe('handoff fixture', () => {
  it('1RMs 265 / 165 / 285 give training maxes 240 / 147.5 / 255', () => {
    expect(trainingMaxFromOneRepMax(265, 'squat', 'lb')).toBe(240);
    expect(trainingMaxFromOneRepMax(165, 'bench', 'lb')).toBe(147.5);
    expect(trainingMaxFromOneRepMax(285, 'deadlift', 'lb')).toBe(255);
  });

  it('squat TM 240, weeks 1-4', () => {
    expect(PHASES.map(p => pair('squat', 240, p))).toEqual([
      '180x5 / 160x5', '205x3 / 185x3', '215x3+ / 180x3', '155x3 / 145x3',
    ]);
  });

  it('bench TM 147.5, weeks 1 and 2', () => {
    expect(pair('bench', 147.5, 'accumulation')).toBe('110x5 / 100x5');
    // 147.5 x 0.85 = 125.4 -> 125
    expect(pair('bench', 147.5, 'intensification')).toBe('125x3 / 115x3');
  });

  it('bench warm-ups before 125 round to 5 lb', () => {
    const sets = calculateWarmupSets(125, 'lb', 'bench').fixedSets.map(s => `${s.weight}x${s.reps}`);
    expect(sets).toEqual(['45x10', '50x5', '75x3', '95x2', '105x1']);
  });

  it('deadlift TM 255, weeks 1 and 2', () => {
    expect(pair('deadlift', 255, 'accumulation')).toBe('190x5 / 170x5');
    expect(rx('deadlift', 255, 'intensification')[0]).toMatchObject({ weight: 215, reps: 3 });
  });

  it('squat AMRAP 215 x 8 at TM 240: e1RM ~272, 90% = 245, fixed +10 = 250, cap 252 -> 250', () => {
    expect(nextTrainingMax({ lift: 'squat', currentTm: 240, topSet: { weight: 215, reps: 8 }, unit: 'lb' }))
      .toMatchObject({ newTm: 250, reason: 'increase' });
  });

  it('next wave at TM 250', () => {
    expect(PHASES.slice(0, 3).map(p => pair('squat', 250, p))).toEqual([
      '190x5 / 170x5', '215x3 / 195x3', '225x3+ / 190x3',
    ]);
  });

  it('squat AMRAP 205 x 5 at TM 230: 90% of e1RM = 215 < 240, so fixed +10 -> 240', () => {
    expect(nextTrainingMax({ lift: 'squat', currentTm: 230, topSet: { weight: 205, reps: 5 }, unit: 'lb' }).newTm).toBe(240);
  });

  it('back-offs 115 x 3 going 3, 3, 3, then 2 end after 3 full sets and leave the load alone', () => {
    const session: SessionSummary = {
      phase: 'intensification',
      mainSets: [
        { weight: 125, reps: 3, kind: 'top' },
        ...[3, 3, 3, 2].map(reps => ({ weight: 115, reps, kind: 'backoff' as const })),
      ],
    };
    expect(nextBackoffAdjustment([session])).toBe(0);
    // Not "2 sessions of all 5" either, so a second identical session doesn't move it.
    expect(nextBackoffAdjustment([session, session])).toBe(0);
    expect(backoffStateFromHistory([session, session]).pct).toBe(0);
    expect(rx('bench', 147.5, 'intensification')[1].weight).toBe(115);
  });
});
