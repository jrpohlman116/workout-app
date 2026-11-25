import { supabase } from '../supabase';
import type { WeakPoints } from '../supabase';
import type { SplitStyle } from '../exercises';
import { positionUpdates } from './position';
import { getProgram, isSupported, DEFAULT_DAYS_PER_WEEK, DEFAULT_PROGRAM_ID } from './registry';
import type { DaysPerWeek, ProgramId } from './types';

export interface RestartChanges {
  programId?: ProgramId;
  daysPerWeek?: DaysPerWeek;
  /** ISO date, or null to clear. Omit to leave unchanged. */
  meetDate?: string | null;
  weakPoints?: WeakPoints;
  splitStyle?: SplitStyle;
}

/** What the profile holds now; used to decide whether default accessories need rebuilding. */
export interface RestartPrevious {
  programId?: ProgramId;
  daysPerWeek?: DaysPerWeek;
  splitStyle?: SplitStyle;
}

/**
 * The one restart operation. Used by Save & restart, and by changing program or
 * days per week. Returns the user to week 1 of the (new) program: position is
 * rewound through positionUpdates, so no caller can reset one field and forget
 * another. Training maxes and workout history are never touched; sessions
 * logged before program_restarted_at just stop counting as complete.
 *
 * Throws on any database error.
 */
export async function restartProgram(
  userId: string,
  changes: RestartChanges = {},
  previous: RestartPrevious = {}
): Promise<void> {
  const programId = changes.programId ?? previous.programId ?? DEFAULT_PROGRAM_ID;
  const daysPerWeek = changes.daysPerWeek ?? previous.daysPerWeek ?? DEFAULT_DAYS_PER_WEEK;

  if (!isSupported(programId, daysPerWeek)) {
    throw new Error(`${programId} does not support ${daysPerWeek} days per week`);
  }

  const now = new Date();
  const payload: Record<string, unknown> = {
    ...positionUpdates(0),
    program_id: programId,
    days_per_week: daysPerWeek,
    program_state: getProgram(programId).initialState(),
    program_start_date: now.toISOString().split('T')[0],
    program_restarted_at: now.toISOString(),
    weak_points_reviewed_cycle: null,
    updated_at: now.toISOString(),
  };
  if (changes.meetDate !== undefined) payload.meet_date = changes.meetDate;
  if (changes.weakPoints !== undefined) payload.weak_points = changes.weakPoints;
  if (changes.splitStyle !== undefined) payload.split_style = changes.splitStyle;

  const { error } = await supabase.from('user_profiles').update(payload).eq('id', userId);
  if (error) throw error;

  const layoutChanged =
    (changes.programId !== undefined && changes.programId !== previous.programId) ||
    (changes.daysPerWeek !== undefined && changes.daysPerWeek !== previous.daysPerWeek) ||
    (changes.splitStyle !== undefined && changes.splitStyle !== previous.splitStyle);
  if (layoutChanged) await resetDefaultTemplates(userId);
}

/**
 * A new layout re-lays-out every day, so it replaces any custom accessory
 * lists rather than being silently masked by them.
 */
export async function resetDefaultTemplates(userId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('user_id', userId)
    .eq('program_variation', 'standard');
  if (error) throw error;
}
