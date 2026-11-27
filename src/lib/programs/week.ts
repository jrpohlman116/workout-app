import type { DayLayout } from './types';

/** First day of the week's layout not done yet, or null when every day is done. */
export function nextDayToTrain(layout: DayLayout, doneDayIds: Set<string>): string | null {
  return layout.days.find(d => !doneDayIds.has(d.dayId))?.dayId ?? null;
}
