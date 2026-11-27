import type { TimeAvailable } from '../readiness/effects';

// On-device Today preferences, until the profile columns (last_time_available,
// warmup_display) and More -> Training preferences land.

export const LAST_TIME_KEY = 'ironform-last-time-available';
export const WARMUP_DISPLAY_KEY = 'ironform-warmup-display';

export function readLastTime(): TimeAvailable {
  try {
    const v = Number(localStorage.getItem(LAST_TIME_KEY));
    return v === 30 || v === 45 ? v : 60;
  } catch {
    return 60;
  }
}

export function saveLastTime(time: TimeAvailable) {
  try { localStorage.setItem(LAST_TIME_KEY, String(time)); } catch { /* storage unavailable */ }
}

export function readWarmupDisplay(): 'collapsed' | 'open' | 'off' {
  try {
    const v = localStorage.getItem(WARMUP_DISPLAY_KEY);
    return v === 'open' || v === 'off' ? v : 'collapsed';
  } catch {
    return 'collapsed';
  }
}

export function saveWarmupDisplay(value: 'collapsed' | 'open' | 'off') {
  try { localStorage.setItem(WARMUP_DISPLAY_KEY, value); } catch { /* storage unavailable */ }
}
