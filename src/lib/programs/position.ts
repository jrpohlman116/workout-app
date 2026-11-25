import { DEFAULT_PROGRAM_WEEKS } from '../constants';
import { MS_PER_WEEK } from './shared/rounding';
import { getProgram } from './registry';
import type { ProgramDefinition, Schedule, WeekBlock } from './types';

// One position pointer: current_week_index, a 0-based index into the program's
// schedule. current_cycle / current_week are derived from it (4 weeks per
// cycle) and written alongside until the cleanup step removes them.

export const WEEKS_PER_CYCLE = 4;

export function cycleWeekFromIndex(index: number): { cycle: number; week: number } {
  const i = Math.max(0, Math.floor(index));
  return { cycle: Math.floor(i / WEEKS_PER_CYCLE) + 1, week: (i % WEEKS_PER_CYCLE) + 1 };
}

export function indexFromCycleWeek(cycle: number, week: number): number {
  return Math.max(0, (cycle - 1) * WEEKS_PER_CYCLE + (week - 1));
}

/** Every column that encodes position, so a caller can't write one and forget another. */
export function positionUpdates(index: number): {
  current_week_index: number;
  current_cycle: number;
  current_week: number;
} {
  const i = Math.max(0, Math.floor(index));
  const { cycle, week } = cycleWeekFromIndex(i);
  return { current_week_index: i, current_cycle: cycle, current_week: week };
}

export interface PositionInput {
  programId?: string | null;
  programStartDate?: string | null;
  meetDate?: string | null;
  currentWeekIndex?: number | null;
  now?: number;
}

export interface ResolvedPosition {
  program: ProgramDefinition;
  schedule: Schedule;
  /** -1 when there is no schedule (no meet date, or no time to fit any waves). */
  currentIndex: number;
  currentBlock: WeekBlock | null;
}

/**
 * The one place that turns profile fields into "which week is the user in".
 * Home and WorkoutDetail both read it, so they can't disagree.
 *
 * Once current_week_index is set it is the source of truth: progress moves when
 * the user finishes or skips a week, not with the calendar. Until then the week
 * containing today (or the first upcoming week) is used.
 */
export function resolvePosition(input: PositionInput): ResolvedPosition {
  const program = getProgram(input.programId);
  const now = input.now ?? Date.now();

  const meetDate = input.meetDate ? new Date(input.meetDate) : undefined;
  const startDate = input.programStartDate
    ? new Date(input.programStartDate)
    : meetDate
      ? new Date(meetDate.getTime() - DEFAULT_PROGRAM_WEEKS * MS_PER_WEEK)
      : new Date(now);

  // With no meet date a program either returns an empty schedule (the page then
  // runs the manual cycle) or a repeating one with no peak block.
  const schedule = program.buildSchedule({ startDate, meetDate });
  const weeks = schedule.weeks;
  if (weeks.length === 0) {
    return { program, schedule, currentIndex: -1, currentBlock: null };
  }

  let currentIndex: number;
  if (input.currentWeekIndex != null) {
    currentIndex = Math.max(0, Math.min(weeks.length - 1, input.currentWeekIndex));
  } else {
    const byDate = weeks.findIndex(w => w.startDate.getTime() <= now && w.endDate.getTime() >= now);
    // Pre-program gap (the schedule starts later than today): first upcoming week.
    currentIndex = byDate >= 0 ? byDate : weeks[0].startDate.getTime() > now ? 0 : -1;
  }

  return { program, schedule, currentIndex, currentBlock: currentIndex >= 0 ? weeks[currentIndex] : null };
}
