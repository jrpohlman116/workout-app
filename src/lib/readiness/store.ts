import { supabase } from '../supabase';
import { localDate, toReadinessSession, type ReadinessSessionRow } from './fromSessions';
import { computeReadiness } from './state';
import type { CheckIn, Readiness, ReadinessSession, ReadinessSource, ReadinessState } from './types';

// Readiness is computed once a day, on first open, and stored in
// readiness_days (one row per user and date). Overrides and check-ins are
// logged on the same row so the thresholds can be tuned later.

/** Sessions read for a reading: enough for the 6-session normal on every lift. */
const SESSION_LIMIT = 24;

export interface ReadinessDay {
  user_id: string;
  date: string;
  score: number;
  state: ReadinessState;
  source: ReadinessSource;
  inputs: { signals: Readiness['signals']; reason: string; note?: string; learning: boolean; sessions: number };
  overridden_to: ReadinessState | null;
  checkin: CheckIn | null;
}

export async function loadReadinessSessions(userId: string): Promise<ReadinessSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('completed_at, lift_type, phase, wave, program_id, main_sets_data, backoffs_capped, backoff_cap')
    .eq('user_id', userId)
    .eq('is_1rm_test', false)
    .order('completed_at', { ascending: false })
    .limit(SESSION_LIMIT);
  if (error) throw error;
  return (data as ReadinessSessionRow[])
    .map(toReadinessSession)
    .filter((s): s is ReadinessSession => s !== null)
    .reverse();
}

export function toReadinessDay(userId: string, date: string, r: Readiness, sessions: number, checkIn: CheckIn | null = null): ReadinessDay {
  return {
    user_id: userId,
    date,
    score: r.score,
    state: r.state,
    source: r.source,
    inputs: { signals: r.signals, reason: r.reason, note: r.note, learning: r.learning, sessions },
    overridden_to: null,
    checkin: checkIn,
  };
}

/**
 * Today's reading: the stored row when there is one, otherwise computed from
 * recent sessions and stored. Two tabs opening at once both compute the same
 * value; the second insert is ignored.
 */
export async function getTodayReadiness(userId: string, now: Date = new Date()): Promise<ReadinessDay> {
  const date = localDate(now);
  const { data: existing, error } = await supabase
    .from('readiness_days')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as ReadinessDay;

  const sessions = await loadReadinessSessions(userId);
  const day = toReadinessDay(userId, date, computeReadiness({ sessions, today: date }), sessions.length);
  const { error: insertError } = await supabase
    .from('readiness_days')
    .upsert(day, { onConflict: 'user_id,date', ignoreDuplicates: true });
  if (insertError) throw insertError;
  return day;
}

/** Records the optional check-in and the state it leads to ("Rough" lowers it one step). */
export async function saveCheckIn(userId: string, checkIn: CheckIn, now: Date = new Date()): Promise<ReadinessDay> {
  const date = localDate(now);
  const sessions = await loadReadinessSessions(userId);
  const day = toReadinessDay(userId, date, computeReadiness({ sessions, today: date, checkIn }), sessions.length, checkIn);
  const { error } = await supabase.from('readiness_days').upsert(day, { onConflict: 'user_id,date' });
  if (error) throw error;
  return day;
}

/** Logs that the lifter trained at a different state than the one suggested. */
export async function saveOverride(userId: string, overriddenTo: ReadinessState, now: Date = new Date()): Promise<void> {
  const { error } = await supabase
    .from('readiness_days')
    .update({ overridden_to: overriddenTo })
    .eq('user_id', userId)
    .eq('date', localDate(now));
  if (error) throw error;
}
