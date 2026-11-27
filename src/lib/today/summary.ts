import { AMRAP_MINIMUM, epley, fixedIncrement } from '../programs/fiveThreeOne/engine';
import type { LiftId, TmUpdate, Unit } from '../programs/types';
import type { LoggedSet } from './session';

// Words for the session summary and the wave-complete screen. Pure.

const round = (n: number, step = 1) => Math.round(n / step) * step;

/** Back-off sets at target, and the set that missed (1-based), if any. */
export function backoffResult(backoffs: LoggedSet[], target: number): { full: number; dropOffAt: number | null } {
  const miss = backoffs.findIndex(b => b.reps < target);
  return { full: miss === -1 ? backoffs.length : miss, dropOffAt: miss === -1 ? null : miss + 1 };
}

/**
 * "How we got there" (proposal #5): the AMRAP, the e1RM and its 90%, the
 * fixed increment, then the larger of the two, capped at +5%.
 */
export function tmSteps(args: {
  liftName: string;
  lift: LiftId;
  unit: Unit;
  previousTm: number;
  amrap: { weight: number; reps: number };
  update: TmUpdate;
}): string[] {
  const { liftName, lift, unit, previousTm, amrap, update } = args;
  const lower = liftName.toLowerCase();
  const e1rm = epley(amrap.weight, amrap.reps);
  const ninety = round(e1rm * 0.9);
  const steps = [`You lifted ${amrap.weight} ${unit} × ${amrap.reps} on the AMRAP set.`];

  if (update.reason === 'increase' || (update.reason === 'hold' && amrap.reps >= AMRAP_MINIMUM)) {
    const fixed = previousTm + fixedIncrement(lift, unit);
    const cap = round(previousTm * 1.05, 0.5);
    steps.push(`Estimated 1RM ≈ ${round(e1rm)} ${unit}. 90% of that is ${ninety} ${unit}.`);
    steps.push(`You hit the ${AMRAP_MINIMUM}-rep minimum, so ${lower} gets the fixed +${fixedIncrement(lift, unit)} ${unit}: ${fixed} ${unit}.`);
    steps.push(`Ironform takes the larger of the two, capped at +5% (${cap} ${unit}). Result: ${update.newTm} ${unit}.`);
    return steps;
  }
  steps.push(`That's under the ${AMRAP_MINIMUM}-rep minimum.`);
  steps.push(update.reason === 'decrease'
    ? `Your back-offs also fell off on the first set in two sessions this wave, so the training max drops 5%: ${update.newTm} ${unit}.`
    : `One short AMRAP isn't a pattern, so the training max holds at ${update.newTm} ${unit} and you repeat the wave.`);
  return steps;
}

/** "+10 lb", "−7.5 lb", "No change". */
export function tmDelta(previous: number, next: number, unit: string): string {
  const d = Math.round((next - previous) * 100) / 100;
  if (d === 0) return 'No change';
  return `${d > 0 ? '+' : '−'}${Math.abs(d)} ${unit}`;
}
