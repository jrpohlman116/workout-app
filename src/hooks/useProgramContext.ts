import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resolvePosition, type ResolvedPosition } from '../lib/programs/position';
import { getLayout } from '../lib/programs/registry';
import type { DayLayout, WeekBlock } from '../lib/programs/types';

export interface ProgramContext extends ResolvedPosition {
  /** Days for the user's program and days per week. */
  layout: DayLayout;
  /** Index of the week being previewed (current + weekOffset), clamped; -1 with no schedule. */
  viewedIndex: number;
  viewedBlock: WeekBlock | null;
}

/**
 * Program, schedule and current/viewed week for the signed-in user. Null until
 * the profile has loaded. Replaces the schedule code Home and WorkoutDetail
 * each used to carry.
 */
export function useProgramContext(weekOffset = 0): ProgramContext | null {
  const { profile } = useAuth();
  const programId = profile?.program_id;
  const startDate = profile?.program_start_date;
  const meetDate = profile?.meet_date;
  const weekIndex = profile?.current_week_index;
  const daysPerWeek = profile?.days_per_week;
  const cycle = profile?.current_cycle;
  const week = profile?.current_week;
  const hasProfile = !!profile;

  return useMemo(() => {
    if (!hasProfile) return null;
    const resolved = resolvePosition({
      programId, programStartDate: startDate, meetDate, currentWeekIndex: weekIndex,
      currentCycle: cycle, currentWeek: week,
    });
    const count = resolved.schedule.weeks.length;
    const viewedIndex = resolved.currentIndex >= 0
      ? Math.max(0, Math.min(count - 1, resolved.currentIndex + weekOffset))
      : -1;
    return { ...resolved, layout: getLayout(programId, daysPerWeek), viewedIndex, viewedBlock: viewedIndex >= 0 ? resolved.schedule.weeks[viewedIndex] : null };
  }, [hasProfile, programId, daysPerWeek, startDate, meetDate, weekIndex, cycle, week, weekOffset]);
}
