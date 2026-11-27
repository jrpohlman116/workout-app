import type { ReadinessState } from './types';

// What readiness and the time prompt change about a session. Readiness changes
// volume, never weight: on a Green or Yellow day no load moves. Red is the one
// exception the programming handoff allows, a light top set at about the
// deload percentage, or an easy run or mobility instead.

export type TimeAvailable = 30 | 45 | 60;

export interface SessionLimits {
  /** Most back-off sets for the primary lift; null means the program's own cap. */
  backoffCap: number | null;
  /**
   * Accessories kept, besides the priority (weak-point or prehab) accessory.
   * 'all', 'half' (rounded down), or a count.
   */
  extraAccessories: 'all' | 'half' | number;
  /** The priority accessory stays unless the session is top set only. */
  keepPriorityAccessory: boolean;
  /** Red: top set only at about the deload percentage. */
  topSetOnly: boolean;
  /** Which limit set the back-off cap, for the "Cut today" note. */
  limitedBy: 'none' | 'readiness' | 'time' | 'both';
}

const READINESS: Record<ReadinessState, Omit<SessionLimits, 'limitedBy'>> = {
  green: { backoffCap: null, extraAccessories: 'all', keepPriorityAccessory: true, topSetOnly: false },
  yellow: { backoffCap: 3, extraAccessories: 'half', keepPriorityAccessory: true, topSetOnly: false },
  red: { backoffCap: 0, extraAccessories: 0, keepPriorityAccessory: false, topSetOnly: true },
};

// Programming handoff, "Time-available prompt": 30 min is the top set,
// back-offs capped at 2 and one priority accessory; 45 adds one accessory;
// 60+ is the full session.
const TIME: Record<TimeAvailable, { backoffCap: number | null; extraAccessories: 'all' | number }> = {
  30: { backoffCap: 2, extraAccessories: 0 },
  45: { backoffCap: 2, extraAccessories: 1 },
  60: { backoffCap: null, extraAccessories: 'all' },
};

const stricterCap = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.min(a, b));

function fewerAccessories(a: 'all' | 'half' | number, b: 'all' | 'half' | number): 'all' | 'half' | number {
  if (a === 'all') return b;
  if (b === 'all') return a;
  if (typeof a === 'number' && typeof b === 'number') return Math.min(a, b);
  // 'half' against a count: the count is the stricter limit only when it's 0 or 1.
  const count = typeof a === 'number' ? a : (b as number);
  return count <= 1 ? count : 'half';
}

/**
 * Limits for today's session. When time and readiness both limit it, the
 * stricter one wins for each part.
 */
export function sessionLimits(state: ReadinessState, time: TimeAvailable = 60): SessionLimits {
  const r = READINESS[state];
  const t = TIME[time];
  const backoffCap = stricterCap(r.backoffCap, t.backoffCap);
  let limitedBy: SessionLimits['limitedBy'] = 'none';
  if (r.backoffCap != null && t.backoffCap != null) {
    limitedBy = r.backoffCap === t.backoffCap ? 'both' : r.backoffCap < t.backoffCap ? 'readiness' : 'time';
  } else if (r.backoffCap != null) limitedBy = 'readiness';
  else if (t.backoffCap != null) limitedBy = 'time';
  return {
    backoffCap,
    extraAccessories: fewerAccessories(r.extraAccessories, t.extraAccessories),
    keepPriorityAccessory: r.keepPriorityAccessory,
    topSetOnly: r.topSetOnly,
    limitedBy,
  };
}

/** Back-off sets to prescribe: the program's cap, lowered by today's limit. */
export function cappedBackoffSets(programCap: number, limits: SessionLimits): number {
  return limits.backoffCap == null ? programCap : Math.min(programCap, limits.backoffCap);
}

/**
 * True when today's limit lowered the back-off cap below the program's own
 * (saved as workout_sessions.backoffs_capped). Such sessions don't count
 * toward the back-off load streaks or the back-off readiness signals.
 */
export function lowersBackoffCap(programCap: number, limits: SessionLimits): boolean {
  return limits.backoffCap != null && limits.backoffCap < programCap;
}
