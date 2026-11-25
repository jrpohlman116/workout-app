import type { DayLayout } from '../types';

// Training order matches the Home screen. The overhead press day replaced the
// accessory-only 'upper' day; past 'upper' sessions stay in history.
// The three main lifts only. With no upper or overhead press day to carry bench
// variations, the deadlift day carries squat and bench variations (chosen from
// the user's weak points) on top of its own deadlift work.
export const JUGGERNAUT_3_DAY: DayLayout = {
  daysPerWeek: 3,
  days: [
    { dayId: 'squat', label: 'Squat', primary: 'squat' },
    { dayId: 'bench', label: 'Bench', primary: 'bench' },
    { dayId: 'deadlift', label: 'Deadlift', primary: 'deadlift', variationSlots: ['squat', 'bench'] },
  ],
};

export const JUGGERNAUT_4_DAY: DayLayout = {
  daysPerWeek: 4,
  days: [
    { dayId: 'squat', label: 'Squat', primary: 'squat' },
    { dayId: 'ohp', label: 'Overhead press', primary: 'ohp' },
    { dayId: 'deadlift', label: 'Deadlift', primary: 'deadlift' },
    { dayId: 'bench', label: 'Bench', primary: 'bench' },
  ],
};
