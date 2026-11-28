import { supabase, type TrainingMaxChange } from '../supabase';
import { epley } from './fiveThreeOne/engine';
import type { LiftId, TmUpdate } from './types';

/** Arguments for the apply_training_max_change function. */
export interface TmChangeArgs {
  p_lift: LiftId;
  p_new_tm: number;
  p_reason: TmUpdate['reason'];
  p_amrap_weight: number;
  p_amrap_reps: number;
  p_e1rm: number;
  p_explanation: string;
  p_cycle_index: number | null;
}

/** Pure: the history row an AMRAP-driven update writes. e1RM is Epley, to 0.1. */
export function tmChangeArgs(args: {
  lift: LiftId;
  update: TmUpdate;
  topSet: { weight: number; reps: number };
  cycleIndex?: number;
}): TmChangeArgs {
  const { lift, update, topSet, cycleIndex } = args;
  return {
    p_lift: lift,
    p_new_tm: update.newTm,
    p_reason: update.reason,
    p_amrap_weight: topSet.weight,
    p_amrap_reps: topSet.reps,
    p_e1rm: Math.round(epley(topSet.weight, topSet.reps) * 10) / 10,
    p_explanation: update.explanation,
    p_cycle_index: cycleIndex ?? null,
  };
}

/**
 * Applies a training max update after the AMRAP: sets the profile's TM and
 * records the change, in one database call. Holds are recorded too, so the
 * history shows every wave. Throws on failure.
 */
export async function recordTrainingMaxChange(args: Parameters<typeof tmChangeArgs>[0]): Promise<TrainingMaxChange> {
  const { data, error } = await supabase.rpc('apply_training_max_change', tmChangeArgs(args));
  if (error) throw error;
  return data as TrainingMaxChange;
}
