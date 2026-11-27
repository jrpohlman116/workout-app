import { calculatePlateBreakdown } from '../calculations';
import { prescribeDay } from '../programs/prescription';
import { loadIncrement } from '../programs/shared/rounding';
import type { DayDef, LiftId, ProgramDefinition, ProgramState, SetGroup, Unit, WeekBlock } from '../programs/types';
import { cappedBackoffSets, lowersBackoffCap, sessionLimits, type SessionLimits, type TimeAvailable } from '../readiness/effects';
import type { ReadinessState } from '../readiness/types';

// Today's session, worked out before it starts (UX handoff, phase 3). Pure:
// the screens render this and never compute a load themselves.

export interface PlanAccessory {
  name: string;
  sets: number;
  /** "8-12" */
  reps: string;
  /** The weak-point or prehab accessory a short or tired day keeps. */
  priority: boolean;
  /** Cut for time or readiness; keeps its weight for next time and never counts as a miss. */
  cut: boolean;
}

export interface TodayPlan {
  lift: LiftId | null;
  trainingMax: number;
  top: (SetGroup & { trainingMax: number }) | null;
  /** Red day: the top set only, at about the deload load. */
  topSetOnly: boolean;
  /** Back-offs for the primary lift, with today's cap; null when there are none today. */
  backoff: (SetGroup & { cap: number; programCap: number }) | null;
  /** Secondary-lift back-offs (5/3/1, 3 days). Not shown on a screen yet. */
  secondary: SetGroup[];
  accessories: PlanAccessory[];
  limits: SessionLimits;
  /** True when today's cap is lower than the program's (saved as backoffs_capped). */
  backoffsCapped: boolean;
  minutes: number;
}

/** Per-side plates for a barbell load: "35 + 5 per side", "empty bar". Null below the bar. */
export function platesPerSide(weight: number, barWeight: number, plates: number[]): string | null {
  const breakdown = calculatePlateBreakdown(weight, barWeight, plates);
  if (!breakdown) return null;
  if (breakdown.plates.length === 0) return 'Empty bar';
  const each = breakdown.plates.flatMap(p => Array.from({ length: p.count }, () => String(p.weight)));
  return `${each.join(' + ')} per side${breakdown.exact ? '' : ` (${breakdown.loadedWeight} loadable)`}`;
}

/**
 * Accessories kept today. The priority accessory stays unless it's top set
 * only; the rest are kept in order up to the limit and the others are cut.
 */
export function planAccessories(
  list: { name: string; sets: number; reps: string }[],
  limits: SessionLimits,
  priorityIndex = 0,
): PlanAccessory[] {
  const others = list.filter((_, i) => i !== priorityIndex).length;
  const keepOthers = limits.extraAccessories === 'all' ? others
    : limits.extraAccessories === 'half' ? Math.floor(others / 2)
    : limits.extraAccessories;
  let kept = 0;
  return list.map((a, i) => {
    const priority = i === priorityIndex;
    const cut = priority ? !limits.keepPriorityAccessory : kept++ >= keepOthers;
    return { name: a.name, sets: a.sets, reps: a.reps, priority, cut };
  });
}

// Rough minutes per part, from the default rests: warm-ups and the top set
// about 10, a back-off about 3.5 (3:00 rest), an accessory set about 2 (1:30 rest).
export function estimateMinutes(plan: Pick<TodayPlan, 'top' | 'backoff' | 'accessories'>): number {
  const top = plan.top ? 10 : 0;
  const backoffs = (plan.backoff?.cap ?? 0) * 3.5;
  const accessories = plan.accessories.filter(a => !a.cut).reduce((sum, a) => sum + a.sets * 2, 0);
  return Math.max(5, Math.round((top + backoffs + accessories) / 5) * 5);
}

export function buildTodayPlan(input: {
  program: ProgramDefinition;
  day: DayDef;
  block: WeekBlock;
  trainingMaxes: Partial<Record<LiftId, number>>;
  unit: Unit;
  state?: ProgramState;
  /** The lifter's plates; loads round to what they can load. */
  plates?: readonly number[];
  readiness: ReadinessState;
  time: TimeAvailable;
  accessories: { name: string; sets: number; reps: string }[];
}): TodayPlan {
  const { program, day, block, trainingMaxes, unit, state, plates, readiness, time } = input;
  const limits = sessionLimits(readiness, time);
  const lift = day.primary;
  const trainingMax = lift ? trainingMaxes[lift] ?? 0 : 0;
  const groups = prescribeDay({ program, day, block, trainingMaxes, unit, state, plates }).groups;

  let topGroup = groups.find(g => g.kind === 'top') ?? null;
  // Red: the light top set the programming handoff allows, about the deload
  // load. The only time readiness moves a weight, and only down.
  if (limits.topSetOnly && topGroup && lift && block.phase !== 'deload') {
    const deload = program.prescribe({ block: { ...block, phase: 'deload' }, lift, trainingMax, unit, plates }).groups.find(g => g.kind === 'top');
    if (deload) topGroup = { ...deload, isAmrap: false, minReps: undefined };
  }
  const top = topGroup && lift ? { ...topGroup, trainingMax } : null;

  const back = groups.find(g => g.kind === 'backoff');
  const cap = back ? cappedBackoffSets(back.sets, limits) : 0;
  const backoff = back && cap > 0 ? { ...back, cap, programCap: back.sets } : null;
  const secondary = groups
    .filter(g => g.kind === 'secondary')
    .map(g => ({ ...g, sets: cappedBackoffSets(g.sets, limits) }))
    .filter(g => g.sets > 0);

  const accessories = planAccessories(input.accessories, limits);
  const plan = { top, backoff, accessories };
  return {
    lift,
    trainingMax,
    top,
    topSetOnly: limits.topSetOnly,
    backoff,
    secondary,
    accessories,
    limits,
    backoffsCapped: !!back && lowersBackoffCap(back.sets, limits),
    minutes: estimateMinutes(plan),
  };
}

export interface WeightExplanation {
  rows: { label: string; value: string }[];
}

/** "Why 125 lb?": training max, the week's percentage, the raw product, the rounding and readiness. */
export function explainWeight(args: {
  liftName: string;
  trainingMax: number;
  pct?: number;
  weight: number;
  lift: LiftId;
  unit: Unit;
  weekLabel: string;
  readiness: ReadinessState;
  topSetOnly?: boolean;
  plates?: readonly number[];
}): WeightExplanation {
  const { liftName, trainingMax, pct, weight, lift, unit, weekLabel, readiness } = args;
  const rows: WeightExplanation['rows'] = [{ label: `${liftName} training max`, value: `${trainingMax} ${unit}` }];
  if (pct != null && !args.topSetOnly) {
    const raw = Math.round(trainingMax * pct * 10) / 10;
    rows.push({ label: `${weekLabel} top set`, value: `${Math.round(pct * 1000) / 10}%` });
    rows.push({ label: `${trainingMax} × ${Math.round(pct * 1000) / 1000}`, value: `${raw} ${unit}` });
  }
  rows.push({ label: `Rounded to the nearest ${loadIncrement(lift, unit, args.plates)} ${unit}`, value: `${weight} ${unit}` });
  const state = readiness[0].toUpperCase() + readiness.slice(1);
  rows.push({
    label: 'Readiness today',
    value: args.topSetOnly ? `${state} · light top set` : `${state} · no change`,
  });
  return { rows };
}

export type { TimeAvailable };
