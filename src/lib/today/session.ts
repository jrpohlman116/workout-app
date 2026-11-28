import type { TimeAvailable } from '../readiness/effects';

// The state of a Today session as the lifter logs it. Pure reducer, so the
// set rules (a back-off below target ends the back-offs) are testable and the
// screens only dispatch.

export type Stage = 'before' | 'top' | 'backoffs' | 'accessories' | 'summary';

export interface LoggedSet {
  weight: number;
  reps: number;
}

export interface TodaySession {
  stage: Stage;
  time: TimeAvailable;
  top: LoggedSet | null;
  backoffs: LoggedSet[];
  /** True once a back-off missed its target or the cap was reached. */
  backoffsEnded: boolean;
  /** Epoch ms the running rest ends at, if any. */
  restEndsAt: number | null;
  restTotal: number;
  startedAt: string | null;
  /** Warm-up sets logged. Kept in the draft only, never in main_sets_data. */
  warmupsDone: number;
  warmupsSkipped: boolean;
  /** Logged accessory sets by accessory position. */
  accessories: Record<number, LoggedSet[]>;
  /** Today-only swaps: position -> exercise name. */
  swaps: Record<number, string>;
  /** Cut accessories brought back with "Do it anyway". */
  restored: number[];
  /**
   * True once the lifter chose "One more set" past a cap that readiness or
   * time lowered: back-offs then run to the program's own cap, and the
   * session counts as uncapped.
   */
  backoffCapRaised: boolean;
}

export type SessionAction =
  | { type: 'setTime'; time: TimeAvailable }
  | { type: 'start'; now: number }
  | { type: 'logTop'; set: LoggedSet; now: number; restSeconds: number }
  | { type: 'logBackoff'; set: LoggedSet; target: number; cap: number; now: number; restSeconds: number }
  | { type: 'editBackoff'; index: number; set: LoggedSet; target: number; cap: number }
  | { type: 'extendRest'; seconds: number }
  | { type: 'skipRest' }
  | { type: 'goTo'; stage: Stage }
  | { type: 'restore'; session: TodaySession }
  | { type: 'logWarmup'; total: number; now: number; restSeconds: number }
  | { type: 'skipWarmups' }
  | { type: 'logAccessory'; index: number; set: LoggedSet; now: number; restSeconds: number }
  | { type: 'editAccessory'; index: number; setIndex: number; set: LoggedSet }
  | { type: 'swap'; index: number; name: string }
  | { type: 'doAnyway'; index: number }
  | { type: 'raiseBackoffCap' };

export function initialSession(time: TimeAvailable): TodaySession {
  return {
    stage: 'before', time, top: null, backoffs: [], backoffsEnded: false, restEndsAt: null, restTotal: 0, startedAt: null,
    warmupsDone: 0, warmupsSkipped: false, accessories: {}, swaps: {}, restored: [], backoffCapRaised: false,
  };
}

/** Back-offs end at the first set below target reps, or at the cap. */
export function backoffsEnd(backoffs: LoggedSet[], target: number, cap: number): boolean {
  return backoffs.length >= cap || backoffs.some(b => b.reps < target);
}

export function sessionReducer(state: TodaySession, action: SessionAction): TodaySession {
  switch (action.type) {
    case 'setTime':
      return state.stage === 'before' ? { ...state, time: action.time } : state;
    case 'start':
      return { ...state, stage: 'top', startedAt: new Date(action.now).toISOString() };
    case 'logTop':
      return {
        ...state,
        top: action.set,
        stage: 'backoffs',
        restEndsAt: action.restSeconds > 0 ? action.now + action.restSeconds * 1000 : null,
        restTotal: action.restSeconds,
      };
    case 'logBackoff': {
      if (state.backoffsEnded) return state;
      const backoffs = [...state.backoffs, action.set];
      const ended = backoffsEnd(backoffs, action.target, action.cap);
      return {
        ...state,
        backoffs,
        backoffsEnded: ended,
        // No rest after the last back-off; the next screen starts its own.
        restEndsAt: ended ? null : action.now + action.restSeconds * 1000,
        restTotal: ended ? 0 : action.restSeconds,
      };
    }
    case 'editBackoff': {
      // Fixing a logged set can end the back-offs (a miss) or reopen them.
      const backoffs = state.backoffs.map((b, i) => (i === action.index ? action.set : b));
      const firstMiss = backoffs.findIndex(b => b.reps < action.target);
      const kept = firstMiss === -1 ? backoffs : backoffs.slice(0, firstMiss + 1);
      return { ...state, backoffs: kept, backoffsEnded: backoffsEnd(kept, action.target, action.cap) };
    }
    case 'extendRest':
      return state.restEndsAt ? { ...state, restEndsAt: state.restEndsAt + action.seconds * 1000, restTotal: state.restTotal + action.seconds } : state;
    case 'skipRest':
      return { ...state, restEndsAt: null, restTotal: 0 };
    case 'goTo':
      return { ...state, stage: action.stage };
    case 'restore':
      // Drafts from before a field existed get its default.
      return { ...initialSession(action.session.time), ...action.session };
    case 'logWarmup': {
      const warmupsDone = state.warmupsDone + 1;
      const last = warmupsDone >= action.total;
      return {
        ...state,
        warmupsDone,
        restEndsAt: last ? state.restEndsAt : action.now + action.restSeconds * 1000,
        restTotal: last ? state.restTotal : action.restSeconds,
      };
    }
    case 'skipWarmups':
      return { ...state, warmupsSkipped: true, restEndsAt: null, restTotal: 0 };
    case 'logAccessory': {
      const sets = [...(state.accessories[action.index] ?? []), action.set];
      return {
        ...state,
        stage: 'accessories',
        accessories: { ...state.accessories, [action.index]: sets },
        restEndsAt: action.now + action.restSeconds * 1000,
        restTotal: action.restSeconds,
      };
    }
    case 'editAccessory': {
      const sets = (state.accessories[action.index] ?? []).map((s, i) => (i === action.setIndex ? action.set : s));
      return { ...state, accessories: { ...state.accessories, [action.index]: sets } };
    }
    case 'swap': {
      // A swapped exercise starts fresh: its sets belong to the old one.
      const accessories = { ...state.accessories };
      delete accessories[action.index];
      return { ...state, swaps: { ...state.swaps, [action.index]: action.name }, accessories };
    }
    case 'raiseBackoffCap':
      // Only after back-offs stopped at the cap with every set on target;
      // a miss still ends them.
      if (state.backoffCapRaised || state.backoffs.length === 0) return state;
      return { ...state, backoffCapRaised: true, backoffsEnded: false };
    case 'doAnyway':
      return state.restored.includes(action.index) ? state : { ...state, restored: [...state.restored, action.index] };
  }
}

/**
 * The draft the active workout bar reads (same shape the workout page
 * autosaves): every main set in order, which are done, and the rest end.
 */
export function toDraft(session: TodaySession, args: {
  liftType: string;
  plannedTop: LoggedSet | null;
  plannedBackoff: LoggedSet | null;
  cycle: number;
  week: number;
  now: number;
}) {
  const sets: { weight: string; reps: string }[] = [];
  const checks: boolean[] = [];
  const push = (s: LoggedSet, done: boolean) => {
    sets.push({ weight: String(s.weight), reps: String(s.reps) });
    checks.push(done);
  };
  const top = session.top ?? args.plannedTop;
  if (top) push(top, !!session.top);
  session.backoffs.forEach(b => push(b, true));
  if (!session.backoffsEnded && args.plannedBackoff) push(args.plannedBackoff, false);
  return {
    flow: 'today' as const,
    liftType: args.liftType,
    mainSets: sets,
    setChecks: { main: checks, accessories: {} },
    topCount: 1,
    restEndsAt: session.restEndsAt,
    session,
    cycle: args.cycle,
    week: args.week,
    savedAt: new Date(args.now).toISOString(),
  };
}
