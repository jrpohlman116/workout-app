import type { DayLayout, LiftId, ProgramDefinition, ProgramState, Unit, WeekBlock } from './types';

/** First day of the week's layout not done yet, or null when every day is done. */
export function nextDayToTrain(layout: DayLayout, doneDayIds: Set<string>): string | null {
  return layout.days.find(d => !doneDayIds.has(d.dayId))?.dayId ?? null;
}

export type DayState = 'done' | 'today' | 'upcoming';

export interface WeekRow {
  dayId: string;
  /** "01" */
  number: string;
  label: string;
  lift: LiftId | null;
  state: DayState;
  /** Exact top-set load; null with no max or no main lift. */
  weight: number | null;
  needsMax: boolean;
  /** "Mon", for a done day. */
  doneOn?: string;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * "This week" on Home (proposal #3): each day with its exact top-set load.
 * In the current week the first day not done is "today"; other weeks have no
 * today. Loads round to the lifter's plates.
 */
export function weekRows(args: {
  layout: DayLayout;
  program: ProgramDefinition;
  block: WeekBlock | null;
  trainingMaxes: Partial<Record<LiftId, number>>;
  unit: Unit;
  plates?: readonly number[];
  state?: ProgramState;
  done: Map<string, string>;
  isCurrentWeek: boolean;
}): WeekRow[] {
  const { layout, program, block, trainingMaxes, unit, plates, state, done, isCurrentWeek } = args;
  const today = isCurrentWeek ? nextDayToTrain(layout, new Set(done.keys())) : null;
  return layout.days.map((day, i) => {
    const max = day.primary ? trainingMaxes[day.primary] ?? 0 : 0;
    const top = day.primary && max > 0 && block
      ? program.prescribe({ block, lift: day.primary, trainingMax: max, unit, plates, state }).groups.find(g => g.kind === 'top')
      : undefined;
    const completedAt = done.get(day.dayId);
    return {
      dayId: day.dayId,
      number: String(i + 1).padStart(2, '0'),
      label: day.label,
      lift: day.primary,
      state: completedAt !== undefined ? 'done' : day.dayId === today ? 'today' : 'upcoming',
      weight: top?.weight ?? null,
      needsMax: !!day.primary && max <= 0,
      ...(completedAt ? { doneOn: WEEKDAY[new Date(completedAt).getDay()] } : {}),
    };
  });
}
