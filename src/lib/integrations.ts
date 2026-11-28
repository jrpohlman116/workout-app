import { supabase } from './supabase';
import type { WearableDay } from './readiness/wearable';

// The app's side of integrations. Tokens never reach the browser: connecting,
// syncing and disconnecting go through Edge Functions.

export type Provider = 'oura' | 'strava';

export interface Integration {
  provider: Provider;
  status: 'connected' | 'error' | 'disconnected';
  last_synced_at: string | null;
}

export async function loadIntegrations(userId: string): Promise<Integration[]> {
  const { data, error } = await supabase.from('user_integrations').select('provider, status, last_synced_at').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as Integration[];
}

export const isConnected = (list: Integration[]) => list.some(i => i.status !== 'disconnected');

/** Sends the browser to the provider's consent page. */
export async function connect(provider: Provider): Promise<void> {
  const { data, error } = await supabase.functions.invoke('integrations-connect', { body: { provider } });
  if (error || !data?.url) throw error ?? new Error('No consent URL');
  window.location.assign(data.url);
}

export async function disconnect(provider: Provider): Promise<void> {
  const { error } = await supabase.functions.invoke('integrations-disconnect', { body: { provider } });
  if (error) throw error;
}

export async function syncNow(date: string): Promise<void> {
  const { error } = await supabase.functions.invoke('integrations-sync', { body: { date } });
  if (error) throw error;
}

type WearableRow = {
  provider: Provider;
  hrv_ms: number | null; hrv_baseline_ms: number | null;
  sleep_minutes: number | null; sleep_baseline_minutes: number | null;
  runs: WearableDay['runs'] | null;
};

/** Every provider's row for a date, merged into one day. Null when none synced. */
export async function loadWearableDay(userId: string, date: string): Promise<WearableDay | null> {
  const { data, error } = await supabase.from('wearable_days').select('*').eq('user_id', userId).eq('date', date);
  if (error || !data?.length) return null;
  const rows = data as WearableRow[];
  const first = <K extends keyof WearableRow>(k: K) => rows.find(r => r[k] != null)?.[k] ?? null;
  return {
    date,
    hrvMs: first('hrv_ms') as number | null,
    hrvBaselineMs: first('hrv_baseline_ms') as number | null,
    sleepMinutes: first('sleep_minutes') as number | null,
    sleepBaselineMinutes: first('sleep_baseline_minutes') as number | null,
    runs: rows.flatMap(r => r.runs ?? []),
  };
}
