import type { DayLayout } from '../types';

// The 3-day layout follows the programming handoff: bench back-offs on squat
// day and deadlift back-offs on bench day (secondary lifts), and squat and
// bench variations on deadlift day. The 4-day layout gives every lift its own
// day, so it has no secondary lifts.
export const FIVE_THREE_ONE_3_DAY: DayLayout = {
  daysPerWeek: 3,
  days: [
    { dayId: 'squat', label: 'Squat', primary: 'squat', secondary: ['bench'] },
    { dayId: 'bench', label: 'Bench', primary: 'bench', secondary: ['deadlift'] },
    { dayId: 'deadlift', label: 'Deadlift', primary: 'deadlift', variationSlots: ['squat', 'bench'] },
  ],
};

export const FIVE_THREE_ONE_4_DAY: DayLayout = {
  daysPerWeek: 4,
  days: [
    { dayId: 'squat', label: 'Squat', primary: 'squat' },
    { dayId: 'ohp', label: 'Overhead press', primary: 'ohp' },
    { dayId: 'deadlift', label: 'Deadlift', primary: 'deadlift' },
    { dayId: 'bench', label: 'Bench', primary: 'bench' },
  ],
};
