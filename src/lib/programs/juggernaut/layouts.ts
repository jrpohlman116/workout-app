import type { DayLayout } from '../types';

// Training order matches the Home screen. The overhead press day replaced the
// accessory-only 'upper' day; past 'upper' sessions stay in history.
export const JUGGERNAUT_4_DAY: DayLayout = {
  daysPerWeek: 4,
  days: [
    { dayId: 'squat', label: 'Squat', primary: 'squat' },
    { dayId: 'ohp', label: 'Overhead press', primary: 'ohp' },
    { dayId: 'deadlift', label: 'Deadlift', primary: 'deadlift' },
    { dayId: 'bench', label: 'Bench', primary: 'bench' },
  ],
};
