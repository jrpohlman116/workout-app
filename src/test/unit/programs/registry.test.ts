import { describe, it, expect, vi } from 'vitest';
import {
  getProgram, getLayout, listPrograms, isSupported, DEFAULT_PROGRAM_ID, DEFAULT_DAYS_PER_WEEK,
} from '../../../lib/programs/registry';
import {
  buildWaveSchedule, calculateJuggernautSets, calculatePeakingSets, calculateNewTrainingMax,
  type WeekBlock,
} from '../../../lib/calculations';
import type { LiftId } from '../../../lib/programs/types';

const LIFTS: LiftId[] = ['squat', 'bench', 'deadlift'];
const start = new Date('2026-01-05T00:00:00.000Z');
const meet = new Date(start.getTime() + 20 * 7 * 24 * 60 * 60 * 1000);

describe('registry', () => {
  it('defaults to Juggernaut, 4 days', () => {
    expect(DEFAULT_PROGRAM_ID).toBe('juggernaut');
    expect(DEFAULT_DAYS_PER_WEEK).toBe(4);
    expect(isSupported('juggernaut', 4)).toBe(true);
  });

  it('falls back to the default for unknown or missing ids without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getProgram('nope').id).toBe('juggernaut');
    expect(warn).toHaveBeenCalledOnce();
    expect(getProgram(undefined).id).toBe('juggernaut');
    expect(getProgram(null).id).toBe('juggernaut');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

// The contract every registered program must satisfy.
describe.each(listPrograms().map(p => [p.id, p] as const))('program contract: %s', (_id, program) => {
  const schedule = program.buildSchedule({ startDate: start, meetDate: meet });

  it('has metadata and supported days', () => {
    expect(program.name).toBeTruthy();
    expect(program.summary).toBeTruthy();
    expect(program.supportedDays.length).toBeGreaterThan(0);
  });

  it('builds an ordered, non-empty schedule when a meet date is set', () => {
    expect(schedule.weeks.length).toBeGreaterThan(0);
    schedule.weeks.forEach((w, i) => { if (i > 0) expect(w.weekIndex).toBe(schedule.weeks[i - 1].weekIndex + 1); });
  });

  it('has a plain-object initial state', () => {
    expect(typeof program.initialState()).toBe('object');
    expect(program.initialState()).not.toBeNull();
  });

  it('stamps every week with a cycle index that never decreases', () => {
    schedule.weeks.forEach((w, i) => {
      expect(w.cycleIndex).toBeTypeOf('number');
      if (i > 0) expect(w.cycleIndex!).toBeGreaterThanOrEqual(schedule.weeks[i - 1].cycleIndex!);
    });
  });

  it('has a valid layout for every supported days-per-week', () => {
    for (const days of program.supportedDays) {
      const layout = program.layout(days);
      expect(layout.daysPerWeek).toBe(days);
      expect(layout.days).toHaveLength(days);
      const ids = layout.days.map(d => d.dayId);
      expect(new Set(ids).size).toBe(ids.length);
      layout.days.forEach(d => {
        expect(d.label).toBeTruthy();
        if (d.primary !== null) expect(['squat', 'bench', 'deadlift', 'ohp']).toContain(d.primary);
      });
    }
  });

  it('throws for an unsupported days-per-week', () => {
    expect(() => program.layout(5 as never)).toThrow();
  });

  it('with no meet date is either empty (the page runs a manual cycle) or a repeating schedule with no peak block', () => {
    const noMeet = program.buildSchedule({ startDate: start });
    if (noMeet.weeks.length === 0) return;
    expect(noMeet.repeats).toBe(true);
    expect(noMeet.peakWeekIndex).toBe(-1);
    expect(noMeet.weeks.some(w => w.phase === 'peaking' || w.phase === 'meet_week')).toBe(false);
  });

  it('prescribes positive, plate-rounded weights for every week and lift', () => {
    for (const lift of LIFTS) {
      for (const block of schedule.weeks) {
        const { groups } = program.prescribe({ block, lift, trainingMax: 240, unit: 'lb' });
        expect(groups.length).toBeGreaterThan(0);
        for (const g of groups) {
          expect(g.weight).toBeGreaterThan(0);
          // Every program rounds to at least a 2.5 lb step (bench-like lifts use the half step).
          expect(g.weight % 2.5).toBe(0);
          expect(g.sets).toBeGreaterThan(0);
        }
      }
    }
  });

  it('only updates the training max on its trigger week', () => {
    for (const block of schedule.weeks) {
      const res = program.updateTrainingMax({ lift: 'squat', currentTm: 240, block, topSet: { weight: 215, reps: 8 }, unit: 'lb' });
      if (res) expect(res.newTm).toBeGreaterThan(0);
    }
    expect(schedule.weeks.some(b =>
      program.updateTrainingMax({ lift: 'squat', currentTm: 240, block: b, topSet: { weight: 215, reps: 8 }, unit: 'lb' }) !== null
    )).toBe(true);
  });
});

describe('3-day layout', () => {
  const days = getLayout('juggernaut', 3).days;

  it('is the three main lifts in training order', () => {
    expect(days.map(d => d.dayId)).toEqual(['squat', 'bench', 'deadlift']);
    expect(days.map(d => d.primary)).toEqual(['squat', 'bench', 'deadlift']);
  });

  it('puts squat and bench variation slots on the deadlift day only', () => {
    expect(days.find(d => d.dayId === 'deadlift')?.variationSlots).toEqual(['squat', 'bench']);
    expect(days.filter(d => d.variationSlots).map(d => d.dayId)).toEqual(['deadlift']);
  });

  it('is supported, and the 4-day layout has no variation slots', () => {
    expect(isSupported('juggernaut', 3)).toBe(true);
    expect(getLayout('juggernaut', 4).days.some(d => d.variationSlots)).toBe(false);
  });
});

describe('getLayout', () => {
  it('returns the 4-day Juggernaut layout in Home order', () => {
    expect(getLayout('juggernaut', 4).days.map(d => d.dayId)).toEqual(['squat', 'ohp', 'deadlift', 'bench']);
  });

  it('gives every day a main lift, with overhead press replacing the upper day', () => {
    const days = getLayout('juggernaut', 4).days;
    expect(days.filter(d => d.primary === null)).toEqual([]);
    expect(days.find(d => d.dayId === 'ohp')?.primary).toBe('ohp');
    expect(days.some(d => d.dayId === 'upper')).toBe(false);
    expect(days.find(d => d.dayId === 'bench')?.primary).toBe('bench');
  });

  it('falls back to the default layout for unsupported or missing days', () => {
    expect(getLayout('juggernaut', 5).daysPerWeek).toBe(4);
    expect(getLayout('juggernaut', undefined).daysPerWeek).toBe(4);
    expect(getLayout('nope' as never, null).daysPerWeek).toBe(4);
  });
});

describe('juggernaut definition matches the engine', () => {
  const program = getProgram('juggernaut');

  it('buildSchedule equals buildWaveSchedule', () => {
    expect(program.buildSchedule({ startDate: start, meetDate: meet })).toEqual(buildWaveSchedule(start, meet));
  });

  it('prescribe equals the underlying sets functions', () => {
    const weeks = buildWaveSchedule(start, meet).weeks;
    for (const block of weeks) {
      if (block.phase === 'meet_week') continue;
      const { groups } = program.prescribe({ block, lift: 'squat', trainingMax: 240, unit: 'lb' });
      const cfg = block.phase === 'peaking'
        ? calculatePeakingSets(block.peakWeek ?? 1, block.totalPeakWeeks ?? 3, 240, 'lb', 'squat')
        : calculateJuggernautSets(block.wave!, block.phase, 240, 'lb');
      expect(groups[0]).toMatchObject({ sets: cfg.numSets, reps: cfg.reps, weight: cfg.weight, isAmrap: cfg.isAmap });
      expect(groups[1]?.weight).toBe(cfg.downSets?.weight);
    }
  });

  it('meet week is one single at 55% of TM', () => {
    const weeks = buildWaveSchedule(start, meet).weeks;
    const block = weeks[weeks.length - 1];
    expect(block.phase).toBe('meet_week');
    expect(program.prescribe({ block, lift: 'squat', trainingMax: 240, unit: 'lb' }).groups[0])
      .toMatchObject({ sets: 1, reps: 1, weight: 130 });
  });

  it('updateTrainingMax equals calculateNewTrainingMax in realization and is null elsewhere', () => {
    const weeks = buildWaveSchedule(start, meet).weeks;
    const real = weeks.find(w => w.phase === 'realization') as WeekBlock;
    const res = program.updateTrainingMax({ lift: 'bench', currentTm: 147.5, block: real, topSet: { weight: 132.5, reps: 7 }, unit: 'lb' })!;
    expect(res.newTm).toBe(calculateNewTrainingMax(147.5, real.wave!, 7, 'lb', 'bench'));
    const accum = weeks.find(w => w.phase === 'accumulation')!;
    expect(program.updateTrainingMax({ lift: 'bench', currentTm: 147.5, block: accum, topSet: { weight: 110, reps: 5 }, unit: 'lb' })).toBeNull();
  });
});
