// The one place loads are rounded. Squat and deadlift use the full plate step
// (5 lb / 2.5 kg); bench and overhead press use half of it (2.5 lb / 1.25 kg),
// per the programming handoff. Callers that load a bar without knowing the
// lift (warm-ups, plate math, Juggernaut's wave sets) use the full step.

type RoundingLift = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'upper' | string;

const isPressing = (lift: RoundingLift) => lift === 'bench' || lift === 'ohp' || lift === 'upper';

/** Plate step for a lift. With no lift, the full step. */
export function loadIncrement(lift: RoundingLift | undefined, unit: string): number {
  const full = unit === 'kg' ? 2.5 : 5;
  return lift && isPressing(lift) ? full / 2 : full;
}

/** Nearest multiple of the lift's plate step. */
export function roundLoad(value: number, lift: RoundingLift | undefined, unit: string): number {
  const step = loadIncrement(lift, unit);
  // The epsilon keeps x.5 boundaries (187.5 -> 190) from flipping on float noise.
  return Math.round(value / step + 1e-9) * step;
}

/** Largest multiple of the lift's plate step at or below the value. */
export function floorLoad(value: number, lift: RoundingLift | undefined, unit: string): number {
  const step = loadIncrement(lift, unit);
  return Math.floor(value / step + 1e-9) * step;
}

/** Full plate step for a unit: 5 lb or 2.5 kg. Same as loadIncrement with no lift. */
export function getRoundingIncrement(unit: string, lift?: RoundingLift): number {
  return loadIncrement(lift, unit);
}

// Used wherever date math needs a week in milliseconds
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
