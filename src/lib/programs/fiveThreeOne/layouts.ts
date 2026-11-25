import type { DayLayout } from '../types';

// Same shape as Juggernaut's layouts today. The handoff also has bench
// back-offs on squat day and deadlift back-offs on bench day (secondary
// lifts); those arrive with the drop-off back-off work, not here.
export const FIVE_THREE_ONE_3_DAY: DayLayout = {
  daysPerWeek: 3,
  days: [
    { dayId: 'squat', label: 'Squat', primary: 'squat' },
    { dayId: 'bench', label: 'Bench', primary: 'bench' },
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
