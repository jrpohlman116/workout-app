import { useEffect, useState } from 'react';
import { liftNames } from '../lib/exercises';

// What the active workout bar shows, read from the workout draft the session
// autosaves to localStorage (jt_draft_<user>_<lift>). A draft exists from the
// first logged change until the session is saved or discarded.

export interface DraftSnapshot {
  liftType: string;
  mainSets?: { reps: string; weight: string }[];
  setChecks?: { main?: boolean[]; accessories?: Record<string, boolean[]> };
  /** Top sets at the start of mainSets; the rest are back-offs. */
  topCount?: number;
  /** Epoch ms when the current rest ends, if one is running. */
  restEndsAt?: number | null;
  cycle?: number;
  week?: number;
  savedAt: string;
}

export interface ActiveSession {
  lift: string;
  /** "Squat · Back-off set 2" */
  title: string;
  /** "Next: 185 lb × 3", or undefined when the main sets are done. */
  next?: string;
  /** Seconds of rest left, when a rest is running. */
  restSeconds?: number;
}

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Pure: the bar's content for a draft, or null when it isn't a live session. */
export function activeSessionFromDraft(
  draft: DraftSnapshot,
  args: { now: number; cycle?: number; week?: number; unit?: string },
): ActiveSession | null {
  const { now, unit = 'lb' } = args;
  if (now - Date.parse(draft.savedAt) > DRAFT_MAX_AGE_MS) return null;
  // A draft from another week is stale; the workout page drops it too.
  if (args.cycle != null && draft.cycle != null && draft.cycle !== args.cycle) return null;
  if (args.week != null && draft.week != null && draft.week !== args.week) return null;

  const name = liftNames[draft.liftType] ?? draft.liftType;
  const sets = draft.mainSets ?? [];
  const checks = draft.setChecks?.main ?? [];
  const topCount = draft.topCount ?? 1;
  const nextIndex = sets.findIndex((_, i) => !checks[i]);

  let title: string;
  let next: string | undefined;
  if (sets.length === 0 || nextIndex === -1) {
    title = `${name} · Accessories`;
  } else {
    const set = sets[nextIndex];
    title = nextIndex < topCount
      ? `${name} · ${topCount > 1 ? `Set ${nextIndex + 1}` : 'Top set'}`
      : `${name} · Back-off set ${nextIndex - topCount + 1}`;
    if (set.weight || set.reps) next = `Next: ${set.weight || '—'} ${unit} × ${set.reps || '—'}`;
  }

  const restLeft = draft.restEndsAt ? Math.ceil((draft.restEndsAt - now) / 1000) : 0;
  return { lift: draft.liftType, title, next, ...(restLeft > 0 ? { restSeconds: restLeft } : {}) };
}

/** The newest live draft for a user, or null. */
export function readActiveSession(userId: string, args: { now: number; cycle?: number; week?: number; unit?: string }): ActiveSession | null {
  const prefix = `jt_draft_${userId}_`;
  let newest: DraftSnapshot | null = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const draft = JSON.parse(localStorage.getItem(key) ?? 'null') as DraftSnapshot | null;
      if (draft?.savedAt && (!newest || draft.savedAt > newest.savedAt)) newest = draft;
    }
  } catch {
    return null;
  }
  return newest ? activeSessionFromDraft(newest, args) : null;
}

/**
 * The session in progress, refreshed every second (for the rest countdown)
 * and whenever another tab changes storage. Off while `enabled` is false.
 */
export function useActiveSession(
  userId: string | undefined,
  args: { cycle?: number; week?: number; unit?: string; enabled?: boolean },
): ActiveSession | null {
  const { cycle, week, unit, enabled = true } = args;
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    if (!userId || !enabled) {
      setSession(null);
      return;
    }
    const read = () => setSession(readActiveSession(userId, { now: Date.now(), cycle, week, unit }));
    read();
    const timer = setInterval(read, 1000);
    window.addEventListener('storage', read);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', read);
    };
  }, [userId, cycle, week, unit, enabled]);

  return session;
}

export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
