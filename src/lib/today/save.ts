import { calculateOneRepMax } from '../calculations';
import { supabase, type UserProfile } from '../supabase';
import { backoffStateFromHistory, withBackoffState } from '../programs/backoffs';
import { loadWaveHistory } from '../programs/history';
import { sessionProgramFields } from '../programs/session';
import { recordTrainingMaxChange } from '../programs/tmChanges';
import type { LiftId, ProgramDefinition, TmUpdate, Unit, WeekBlock } from '../programs/types';
import type { ReadinessState } from '../readiness/types';
import type { TodayPlan } from './plan';
import type { TodaySession } from './session';

// Saving a Today session. buildSessionRows is pure; saveTodaySession does the
// writes and is safe to retry: the session row is written once, accessories
// are replaced, and a training max update is only applied with the first write.

export interface SessionRows {
  session: Record<string, unknown>;
  accessories: { exercise_name: string; exercise_order: number; sets_data: { weight: string; reps: string }[] }[];
}

export function buildSessionRows(args: {
  userId: string;
  profile: Pick<UserProfile, 'current_cycle' | 'current_week' | 'program_id' | 'days_per_week'>;
  lift: LiftId;
  block: WeekBlock;
  plan: TodayPlan;
  session: TodaySession;
  readiness: { state: ReadinessState; score: number } | null;
  /** Accessory names in plan order, after today's swaps. */
  accessoryNames: string[];
}): SessionRows {
  const { userId, profile, lift, block, plan, session, readiness, accessoryNames } = args;
  const top = session.top;
  const mainSets = [
    ...(top ? [{ weight: String(top.weight), reps: String(top.reps), kind: 'top', checked: true }] : []),
    ...session.backoffs.map(b => ({ weight: String(b.weight), reps: String(b.reps), kind: 'backoff', checked: true })),
  ];
  return {
    session: {
      user_id: userId,
      lift_type: lift,
      cycle: profile.current_cycle,
      week: profile.current_week,
      weight_lifted: top?.weight ?? 0,
      reps_performed: top?.reps ?? 0,
      calculated_1rm: top && top.reps > 0 ? calculateOneRepMax(top.weight, top.reps) : 0,
      ...sessionProgramFields(profile, lift),
      wave: block.wave ?? null,
      phase: block.phase,
      ...(mainSets.length ? { main_sets_data: mainSets } : {}),
      readiness_state: readiness?.state ?? null,
      readiness_score: readiness?.score ?? null,
      time_available_min: session.time,
      backoffs_capped: plan.backoffsCapped,
      backoff_cap: plan.backoff?.cap ?? 0,
    },
    accessories: accessoryNames
      .map((name, i) => ({
        exercise_name: name,
        exercise_order: i,
        sets_data: (session.accessories[i] ?? []).map(s => ({ weight: String(s.weight), reps: String(s.reps) })),
      }))
      .filter(a => a.sets_data.length > 0),
  };
}

export interface SaveResult {
  sessionId: string;
  /** 5/3/1, after the week 3 AMRAP: the update applied (or the one to retry). */
  tmUpdate: (TmUpdate & { previousTm: number; applied: boolean }) | null;
}

export async function saveTodaySession(args: {
  existingSessionId: string | null;
  rows: SessionRows;
  userId: string;
  profile: UserProfile;
  program: ProgramDefinition;
  lift: LiftId;
  block: WeekBlock;
  trainingMax: number;
  unit: Unit;
  top: { weight: number; reps: number } | null;
}): Promise<SaveResult> {
  const { rows, userId, profile, program, lift, block, unit, top } = args;
  let sessionId = args.existingSessionId;
  let tmUpdate: SaveResult['tmUpdate'] = null;

  if (!sessionId) {
    const { data, error } = await supabase.from('workout_sessions').insert(rows.session).select('id').single();
    if (error) throw error;
    sessionId = data.id as string;

    const history = await loadWaveHistory({ userId, lift, cycle: profile.current_cycle, restartedAt: profile.program_restarted_at });

    if (program.id === 'five_three_one') {
      const next = backoffStateFromHistory(history, block.cycleIndex);
      const { error: stateError } = await supabase
        .from('user_profiles')
        .update({ program_state: withBackoffState(profile.program_state, lift, next) })
        .eq('id', userId);
      // The next session rebuilds it, so this doesn't fail the save.
      if (stateError) console.warn('Failed to save back-off state:', stateError);
    }

    const update = top ? program.updateTrainingMax({ lift, currentTm: args.trainingMax, block, topSet: top, history, unit }) : null;
    if (update && program.id === 'five_three_one' && top) {
      try {
        await recordTrainingMaxChange({ lift, update, topSet: top, cycleIndex: block.cycleIndex });
        tmUpdate = { ...update, previousTm: args.trainingMax, applied: true };
      } catch (error) {
        console.error('Failed to apply training max update:', error);
        tmUpdate = { ...update, previousTm: args.trainingMax, applied: false };
      }
    }
  }

  if (rows.accessories.length) {
    // Replace, so a retry after a failed accessory write doesn't duplicate.
    await supabase.from('accessory_exercises').delete().eq('workout_session_id', sessionId);
    const { error } = await supabase.from('accessory_exercises').insert(rows.accessories.map(a => ({ ...a, workout_session_id: sessionId })));
    if (error) throw Object.assign(error, { sessionId, tmUpdate });
  }

  return { sessionId: sessionId!, tmUpdate };
}
