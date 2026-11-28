import { supabase } from '../supabase';
import type { SessionSummary } from './types';

type SavedSet = { reps: string; weight: string; kind?: SessionSummary['mainSets'][number]['kind']; checked?: boolean };

/**
 * A lift's sessions in one wave (cycle), oldest first, for the rules that look
 * back over a wave: the 5/3/1 second signal and the back-off load streaks.
 * Sets saved unchecked were prescribed but not done (older rows have no flag).
 */
export async function loadWaveHistory(args: {
  userId: string;
  lift: string;
  cycle: number;
  restartedAt?: string | null;
}): Promise<SessionSummary[]> {
  let query = supabase
    .from('workout_sessions')
    .select('phase, main_sets_data, backoffs_capped')
    .eq('user_id', args.userId)
    .eq('lift_type', args.lift)
    .eq('cycle', args.cycle)
    .eq('is_1rm_test', false)
    .order('completed_at', { ascending: true });
  if (args.restartedAt) query = query.gte('completed_at', args.restartedAt);
  const { data, error } = await query;
  if (error || !data) return [];
  return data
    .filter(row => row.phase && Array.isArray(row.main_sets_data))
    .map(row => ({
      phase: row.phase as SessionSummary['phase'],
      backoffsCapped: !!row.backoffs_capped,
      mainSets: (row.main_sets_data as SavedSet[])
        .filter(s => s.checked !== false)
        .map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0, kind: s.kind })),
    }));
}
