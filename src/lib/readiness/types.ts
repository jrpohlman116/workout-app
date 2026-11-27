import type { LiftId } from '../programs/types';

export type ReadinessState = 'green' | 'yellow' | 'red';
export type CheckIn = 'good' | 'okay' | 'rough';
export type ReadinessSource = 'training' | 'wearable';

/**
 * One logged main-lift session, reduced to what readiness reads. Targets come
 * from the session's prescription, so the engine doesn't depend on a program.
 */
export interface ReadinessSession {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  lift: LiftId;
  topReps: number;
  /** Reps the top set had to reach: the AMRAP minimum, or the prescribed reps. */
  topTarget: number;
  /** Back-off sets in order, reps only. */
  backoffReps: number[];
  backoffTarget: number;
  /** Most back-off sets the session allowed. */
  backoffCap: number;
  /** True when readiness or time lowered the back-off cap. */
  capped: boolean;
}

export type SignalKind = 'missed_top_set' | 'short_backoffs' | 'early_dropoff';

export interface Signal {
  kind: SignalKind;
  lift: LiftId;
  /** Plain-language reason, for "Why?". */
  text: string;
}

export interface Readiness {
  state: ReadinessState;
  /** 0-100, always inside the state's band. For display only. */
  score: number;
  source: ReadinessSource;
  signals: Signal[];
  /** One line naming what the state is based on. */
  reason: string;
  /** Set for the first sessions and after a break. */
  note?: string;
  /** True while there are too few sessions to know the lifter's normal. */
  learning: boolean;
  /** The state before a check-in lowered it, when it did. */
  stateBeforeCheckIn?: ReadinessState;
}
