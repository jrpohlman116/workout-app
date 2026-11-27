import type { JuggernautSetsConfig } from '../types';
import { SECONDARY_BACKOFF_CAP } from './fiveThreeOne/engine';
import type { DayDef, LiftId, Prescription, ProgramDefinition, ProgramState, SetGroup, Unit, WeekBlock } from './types';

/**
 * Flattens a prescription into the shape the workout page builds its main sets
 * from: the top group (sets x reps, AMRAP flag) plus the first back-off group
 * as "down sets" after it. Null when the prescription has no top group.
 * Secondary-lift groups aren't part of it; the Today flow renders those.
 */
export function toSetsConfig(prescription: Prescription): JuggernautSetsConfig | null {
  const top = prescription.groups.find(g => g.kind === 'top');
  if (!top) return null;
  const back = prescription.groups.find(g => g.kind === 'backoff');
  return {
    numSets: top.sets,
    reps: top.reps,
    weight: top.weight,
    isAmap: top.isAmrap,
    ...(back ? { downSets: { weight: back.weight, sets: back.sets, reps: back.reps } } : {}),
  };
}

// Secondary lifts only run in the four wave weeks. Peaking and meet weeks
// strip volume, so they get none.
const WAVE_PHASES = new Set(['accumulation', 'intensification', 'realization', 'deload']);

/**
 * Everything a day prescribes for its barbell lifts: the primary lift's
 * groups, then back-offs for each secondary lift at that lift's back-off load
 * for the week, capped at 3 sets and ended by the first miss. A secondary lift
 * with no training max is left out.
 */
export function prescribeDay(args: {
  program: ProgramDefinition;
  day: DayDef;
  block: WeekBlock;
  trainingMaxes: Partial<Record<LiftId, number>>;
  unit: Unit;
  state?: ProgramState;
}): Prescription {
  const { program, day, block, trainingMaxes, unit, state } = args;
  const groups: SetGroup[] = day.primary
    ? program.prescribe({ block, lift: day.primary, trainingMax: trainingMaxes[day.primary] ?? 0, unit, state }).groups
    : [];

  if (!WAVE_PHASES.has(block.phase)) return { groups };

  for (const lift of day.secondary ?? []) {
    const trainingMax = trainingMaxes[lift] ?? 0;
    if (trainingMax <= 0) continue;
    const backoff = program.prescribe({ block, lift, trainingMax, unit, state }).groups.find(g => g.kind === 'backoff');
    if (!backoff) continue;
    groups.push({
      ...backoff,
      kind: 'secondary',
      lift,
      sets: Math.min(backoff.sets, SECONDARY_BACKOFF_CAP),
      stopRule: 'until-miss',
    });
  }
  return { groups };
}
