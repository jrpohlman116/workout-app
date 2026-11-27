import { floorLoad, roundLoad } from './programs/shared/rounding';
import type { LiftId } from './programs/types';

// Pure helpers for the tools in More (proposal #13).

/** Training max at every 5% from 50% to 100%, rounded to what the lifter can load. */
export function percentageChart(trainingMax: number, lift: LiftId, unit: string, plates?: readonly number[]) {
  const rows: { pct: number; weight: number }[] = [];
  for (let pct = 50; pct <= 100; pct += 5) rows.push({ pct, weight: roundLoad(trainingMax * pct / 100, lift, unit, plates) });
  return rows;
}

export interface Attempt {
  label: 'Opener' | 'Second' | 'Third';
  pct: number;
  weight: number;
  note: string;
}

// Common meet guidance: open with a weight you could triple on a bad day
// (about 90%), take a confident second (about 95%), and go for 100-102% on
// the third. The opener rounds down; the others round to the nearest step.
const PLAN: { label: Attempt['label']; pct: number; note: string; floor?: boolean }[] = [
  { label: 'Opener', pct: 0.9, note: 'A weight you could lift for a triple on a bad day.', floor: true },
  { label: 'Second', pct: 0.95, note: 'Builds confidence and sets up the third.' },
  { label: 'Third', pct: 1.0, note: 'Your best on the day. Go up to 102% if the second moved fast.' },
];

/** Openers, seconds and thirds from a 1RM (your tested max). */
export function meetAttempts(oneRepMax: number, lift: LiftId, unit: string, plates?: readonly number[]): Attempt[] {
  return PLAN.map(a => ({
    label: a.label,
    pct: Math.round(a.pct * 100),
    weight: (a.floor ? floorLoad : roundLoad)(oneRepMax * a.pct, lift, unit, plates),
    note: a.note,
  }));
}
