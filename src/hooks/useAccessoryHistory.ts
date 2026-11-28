import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toLogged, type LoggedAccessorySet } from '../lib/today/accessories';

const RECENT_SESSIONS = 60;

/**
 * Each exercise's most recent logged sets, by name, across the lifter's
 * recent sessions (not just the last session of this day). A cut or swapped
 * accessory therefore keeps its own history and weight.
 */
export function useAccessoryHistory(userId: string | undefined, names: string[]) {
  const [history, setHistory] = useState<Record<string, LoggedAccessorySet[]>>({});
  const key = [...new Set(names)].sort().join('|');

  useEffect(() => {
    if (!userId || !key) return;
    let cancelled = false;
    (async () => {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(RECENT_SESSIONS);
      if (!sessions?.length || cancelled) return;
      const order = new Map(sessions.map((s, i) => [s.id as string, i]));
      const { data: rows } = await supabase
        .from('accessory_exercises')
        .select('workout_session_id, exercise_name, sets_data')
        .in('workout_session_id', sessions.map(s => s.id))
        .in('exercise_name', key.split('|'));
      if (cancelled || !rows) return;
      const latest: Record<string, { rank: number; sets: LoggedAccessorySet[] }> = {};
      for (const row of rows) {
        const rank = order.get(row.workout_session_id as string) ?? Infinity;
        const sets = toLogged(row.sets_data as { weight?: string; reps?: string }[]);
        const name = row.exercise_name as string;
        if (sets.length && (!latest[name] || rank < latest[name].rank)) latest[name] = { rank, sets };
      }
      setHistory(Object.fromEntries(Object.entries(latest).map(([n, v]) => [n, v.sets])));
    })();
    return () => { cancelled = true; };
  }, [userId, key]);

  return history;
}
