// Bar loading increments differ by unit: 5 lb plates vs 2.5 kg plates
export function getRoundingIncrement(unit: string): number {
  return unit === 'kg' ? 2.5 : 5;
}

// Used wherever date math needs a week in milliseconds
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
