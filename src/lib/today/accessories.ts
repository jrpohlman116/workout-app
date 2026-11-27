// Accessories: double progression (programming handoff; UX handoff phase 3).
// Each accessory has a set count, a rep range and a working weight.
// - Top of the range on every set: next session adds the smallest step and
//   reps start back at the bottom. The card says "Up from X lb".
// - Below the top on any set: same weight next time.
// - Cut for time or readiness: keeps its weight and never counts as a miss
//   (nothing is logged, so the last logged session still decides).
// - A swap has its own history, by exercise name.
// The weight comes from the exercise's last logged sets, so nothing new is
// stored to make it work.

export interface RepRange {
  min: number;
  max: number;
}

export interface LoggedAccessorySet {
  weight: number;
  reps: number;
}

/** "8-12", "8–12" → 8..12; "10" → 10..10. Null when there's no number (e.g. "AMRAP"). */
export function parseRepRange(reps: string): RepRange | null {
  const nums = (reps.match(/\d+/g) ?? []).map(Number);
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export function formatRange(range: RepRange | null, raw: string): string {
  if (!range) return raw;
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
}

/** Parses saved sets ({ weight: "50", reps: "12" }) and drops empty ones. */
export function toLogged(sets: { weight?: string | number; reps?: string | number }[] | null | undefined): LoggedAccessorySet[] {
  return (sets ?? [])
    .map(s => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }))
    .filter(s => s.reps > 0);
}

export interface AccessoryTarget {
  /** Today's working weight; null with no history (the lifter picks it). */
  weight: number | null;
  /** True when last time topped the range on every set. */
  movedUp: boolean;
  /** Last time's weight, for "Up from X lb". */
  previousWeight: number | null;
}

/** Today's weight from the exercise's last logged sets. */
export function accessoryTarget(last: LoggedAccessorySet[], range: RepRange | null, sets: number, step: number): AccessoryTarget {
  if (last.length === 0) return { weight: null, movedUp: false, previousWeight: null };
  const weight = last[0].weight;
  const topped = !!range && last.length >= sets && last.slice(0, sets).every(s => s.reps >= range.max);
  if (topped && weight > 0) return { weight: Math.round((weight + step) * 100) / 100, movedUp: true, previousWeight: weight };
  return { weight, movedUp: false, previousWeight: weight };
}

/**
 * Prefill for the next set: the previous set's reps today; for the first set,
 * last session's first set (or the bottom of the range after moving up).
 */
export function prefillSet(args: {
  index: number;
  today: LoggedAccessorySet[];
  last: LoggedAccessorySet[];
  target: AccessoryTarget;
  range: RepRange | null;
}): LoggedAccessorySet {
  const { index, today, last, target, range } = args;
  const previous = today[index - 1];
  if (previous) return { weight: previous.weight, reps: previous.reps };
  const reps = target.movedUp ? range?.min ?? 0 : last[0]?.reps ?? range?.min ?? 0;
  return { weight: target.weight ?? 0, reps };
}

/** "100 lb × 12, 12, 12", or with mixed weights "100 × 12, 105 × 10". */
export function summarizeSets(sets: LoggedAccessorySet[], unit: string): string {
  if (sets.length === 0) return '';
  const sameWeight = sets.every(s => s.weight === sets[0].weight);
  if (sameWeight) return `${sets[0].weight ? `${sets[0].weight} ${unit} × ` : ''}${sets.map(s => s.reps).join(', ')}`;
  return sets.map(s => `${s.weight} × ${s.reps}`).join(', ');
}

/** What happens next time, after today's sets. */
export function nextTimeNote(sets: LoggedAccessorySet[], range: RepRange | null, plannedSets: number, step: number, unit: string): string {
  if (!range) return 'Same next time.';
  const topped = sets.length >= plannedSets && sets.every(s => s.reps >= range.max);
  return topped
    ? `Hit ${range.max} on every set. Up ${step} ${unit} next time, back to ${range.min} reps.`
    : `Range ${formatRange(range, '')}. Hit ${range.max} on every set to move up. Same weight next time.`;
}

/**
 * The smallest weight jump for an accessory, by equipment (UX handoff):
 * 5 lb (2.5 kg) for dumbbells, per hand, and barbells; the cable stack's step
 * from Equipment settings, 5 lb by default. All 5 lb until those settings exist.
 */
export function accessoryStep(unit: string): number {
  return unit === 'kg' ? 2.5 : 5;
}
