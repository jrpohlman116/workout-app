import type { ReadinessState } from './types';

// Readiness is a suggestion. The lifter can train today at another state;
// the choice is stored on the day's row (readiness_days.overridden_to) and
// logged so the thresholds can be tuned. Overriding changes volume, never the
// loads: even Red to Green only restores the normal plan.

interface DayLike {
  state: ReadinessState;
  overridden_to?: ReadinessState | null;
}

/** The state today's session runs at: the lifter's choice, else the suggestion. */
export function effectiveState(day: DayLike | null | undefined): ReadinessState {
  return day?.overridden_to ?? day?.state ?? 'green';
}

export function isOverridden(day: DayLike | null | undefined): boolean {
  return !!day?.overridden_to && day.overridden_to !== day.state;
}

/** What to store for a choice: null when it matches the suggestion. */
export function overrideFor(day: DayLike, chosen: ReadinessState): ReadinessState | null {
  return chosen === day.state ? null : chosen;
}
