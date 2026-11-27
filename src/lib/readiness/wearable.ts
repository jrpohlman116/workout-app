import { clampToBand, wearableScore } from './score';
import type { Readiness, ReadinessState, Signal } from './types';

// Wearable readiness (UX handoff, phase 8). Oura and Strava add HRV, sleep and
// runs to the training signals, which stay in. Pure: providers deliver a
// WearableDay through a ReadinessSource and this decides the state.
//
// Thresholds (Integrations screen): Yellow when HRV is 10% below baseline or
// after a hard run (average HR above 160, or 60+ minutes); Red after 2 Yellow
// days in a row. They're starting points: overrides are logged so they can be
// tuned.

export const HRV_DROP = 0.1;
export const HARD_RUN_AVG_HR = 160;
export const HARD_RUN_MINUTES = 60;

export interface Run {
  /** Start time, ISO. */
  startedAt: string;
  minutes: number;
  avgHr?: number | null;
  distanceKm?: number | null;
}

/** One day of wearable data, merged from every connected provider. */
export interface WearableDay {
  date: string;
  hrvMs?: number | null;
  hrvBaselineMs?: number | null;
  sleepMinutes?: number | null;
  sleepBaselineMinutes?: number | null;
  /** Runs in the 24 hours before the day's first session window. */
  runs: Run[];
}

/** What each cloud provider implements; the engine never sees provider APIs. */
export interface ReadinessSource {
  provider: 'oura' | 'strava';
  fetchDay(userId: string, date: string): Promise<Partial<WearableDay>>;
}

export function isHardRun(run: Run): boolean {
  return (run.avgHr ?? 0) > HARD_RUN_AVG_HR || run.minutes >= HARD_RUN_MINUTES;
}

export function hrvLow(day: WearableDay): boolean {
  if (!day.hrvMs || !day.hrvBaselineMs) return false;
  return day.hrvMs <= day.hrvBaselineMs * (1 - HRV_DROP);
}

export function wearableSignals(day: WearableDay): Signal[] {
  const signals: Signal[] = [];
  if (hrvLow(day)) {
    const pct = Math.round((1 - day.hrvMs! / day.hrvBaselineMs!) * 100);
    signals.push({ kind: 'hrv_low', text: `HRV ${pct}% below your baseline (${Math.round(day.hrvMs!)} ms)` });
  }
  const hard = day.runs.find(isHardRun);
  if (hard) {
    const hr = hard.avgHr ? ` · average HR ${Math.round(hard.avgHr)}` : '';
    signals.push({ kind: 'hard_run', text: `Hard run in the last 24 hours: ${Math.round(hard.minutes)} min${hr}` });
  }
  return signals;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
/** 75 at baseline, 50 at 10% below, 100 at 10% above. */
const ratioPart = (value?: number | null, baseline?: number | null) =>
  value && baseline ? clamp(75 + (value / baseline - 1) * 250) : 75;

const ORDER: Record<ReadinessState, number> = { green: 0, yellow: 1, red: 2 };
const stricter = (a: ReadinessState, b: ReadinessState) => (ORDER[a] >= ORDER[b] ? a : b);

/**
 * Today's readiness with a wearable: the training reading, plus HRV and runs.
 * The stricter state wins; two Yellow wearable days in a row make Red. The
 * score uses the wearable weighting and lands in the state's band.
 */
export function withWearable(args: {
  training: Readiness;
  day: WearableDay;
  /** Yesterday's stored state, for "2 yellow days in a row". */
  yesterday?: ReadinessState | null;
  /** The training score before clamping (40/40/20), for the training part. */
  trainingScore: number;
}): Readiness {
  const { training, day, yesterday } = args;
  const signals = wearableSignals(day);
  let wearableState: ReadinessState = signals.length ? 'yellow' : 'green';
  if (wearableState === 'yellow' && yesterday && yesterday !== 'green') wearableState = 'red';

  const state = training.learning ? wearableState : stricter(training.state, wearableState);
  const runPart = day.runs.some(isHardRun) ? 50 : day.runs.length ? 85 : 100;
  const raw = wearableScore({
    hrv: ratioPart(day.hrvMs, day.hrvBaselineMs),
    sleep: ratioPart(day.sleepMinutes, day.sleepBaselineMinutes),
    runLoad: runPart,
    training: args.trainingScore,
  });

  const parts: string[] = [];
  if (day.hrvMs && day.hrvBaselineMs) parts.push(hrvLow(day) ? 'HRV below baseline' : 'HRV at baseline');
  if (day.sleepMinutes) parts.push(`${Math.floor(day.sleepMinutes / 60)}h ${Math.round(day.sleepMinutes % 60)}m sleep`);
  parts.push(day.runs.some(isHardRun) ? 'hard run in the last 24 hours' : 'no hard run in 24 hours');

  return {
    ...training,
    state,
    score: clampToBand(raw, state),
    source: 'wearable',
    signals: [...signals, ...training.signals],
    reason: `${parts.join(' · ')}.`,
  };
}

