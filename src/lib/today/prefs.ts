import { supabase } from '../supabase';
import type { TimeAvailable } from '../readiness/effects';

// Today preferences. The profile is the source (last_time_available,
// warmup_display); the device copy covers the moment before the profile loads
// and profiles from before those columns existed.

export const LAST_TIME_KEY = 'ironform-last-time-available';
export const WARMUP_DISPLAY_KEY = 'ironform-warmup-display';

type WarmupDisplay = 'collapsed' | 'open' | 'off';
interface PrefFields {
  last_time_available?: number | null;
  warmup_display?: string | null;
}

const asTime = (v: unknown): TimeAvailable | null => (v === 30 || v === 45 || v === 60 ? v : null);
const asDisplay = (v: unknown): WarmupDisplay | null => (v === 'collapsed' || v === 'open' || v === 'off' ? v : null);

export function readLastTime(profile?: PrefFields | null): TimeAvailable {
  const fromProfile = asTime(profile?.last_time_available);
  if (fromProfile) return fromProfile;
  try {
    return asTime(Number(localStorage.getItem(LAST_TIME_KEY))) ?? 60;
  } catch {
    return 60;
  }
}

export function readWarmupDisplay(profile?: PrefFields | null): WarmupDisplay {
  // A profile only says 'collapsed' by default, so a device choice made
  // before the column existed still wins over that default.
  const fromProfile = asDisplay(profile?.warmup_display);
  if (fromProfile && fromProfile !== 'collapsed') return fromProfile;
  try {
    return asDisplay(localStorage.getItem(WARMUP_DISPLAY_KEY)) ?? fromProfile ?? 'collapsed';
  } catch {
    return fromProfile ?? 'collapsed';
  }
}

async function saveToProfile(userId: string | undefined, fields: Record<string, unknown>) {
  if (!userId) return;
  const { error } = await supabase.from('user_profiles').update(fields).eq('id', userId);
  if (error) console.warn('Failed to save preference:', error);
}

export function saveLastTime(time: TimeAvailable, userId?: string) {
  try { localStorage.setItem(LAST_TIME_KEY, String(time)); } catch { /* storage unavailable */ }
  return saveToProfile(userId, { last_time_available: time });
}

export function saveWarmupDisplay(value: WarmupDisplay, userId?: string) {
  try { localStorage.setItem(WARMUP_DISPLAY_KEY, value); } catch { /* storage unavailable */ }
  return saveToProfile(userId, { warmup_display: value });
}
