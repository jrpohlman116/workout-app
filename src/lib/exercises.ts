import type { StickingPoint } from './supabase';

export const liftNames: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
  upper: 'Upper Body',
};

export const liftNamesShort: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  upper: 'Upper',
};

// Squat day: deadlift accessories (cross-day prescription)
// Deadlift day: squat accessories
// Bench day: bench support
// Upper day: bench weak-point focused accessories
export const baseExercises = {
  squat: [
    { name: 'Romanian Deadlift', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Plank', reps: '30-60 sec', sets: 3, isBodyweight: true },
  ],
  bench: [
    { name: 'Incline DB Press', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Barbell Curls', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Tricep Pressdowns', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
  ],
  deadlift: [
    { name: 'Bulgarian Split Squats', reps: '8-10', sets: 3, isBodyweight: false },
    { name: 'Leg Press', reps: '5-8', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15 min', sets: 3, isBodyweight: true },
    { name: 'B Stance RDLs', reps: '8-12', sets: 3, isBodyweight: false },
  ],
  upper: [
    { name: 'Incline DB Press', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Close-Grip Bench', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
    { name: 'Lateral Raise Complex', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Tricep Pressdowns', reps: '8-12', sets: 3, isBodyweight: false },
  ],
};

export const additionalExercises = [
  { name: 'Box Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pause Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Front Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Goblet Squats', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Walking Lunges', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Leg Extensions', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Seated Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Hip Thrusts', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Hip Abduction', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Nordic Curls', reps: '5-8', sets: 3, isBodyweight: true },
  { name: 'Chin-Ups', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Pull-Ups', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Chest Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Cable Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Shrugs', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Farmer Walks', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Anderson Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Safety Bar Box Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Tempo Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pin Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Single-Leg Calf Raises', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Donkey Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Jump Rope', reps: '60-120 sec', sets: 3, isBodyweight: true },
  { name: 'Lateral Band Walks', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Clamshells', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Fire Hydrants', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Cable Hip Abduction', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Sissy Squats', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Spanish Squats', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Terminal Knee Extensions', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Zercher Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Safety Bar Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'High Bar Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Bodyweight Squats', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Dumbbell Squats', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Kettlebell Squats', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Static Lunges', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Reverse Lunges', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Step-Ups', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Leg Press Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Single-Leg Seated Calf Raises', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Tibialis Raises', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Glute Bridges', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Single-Leg Hip Thrusts', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Cable Pull-Throughs', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Kettlebell Swings', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Eccentric Leg Curls', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Partner Hamstring Curls', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Glute Ham Raise', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Slider Hamstring Curls', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Assisted Chin-Ups', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Underhand Lat Pulldowns', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Weighted Chin-Ups', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Lat Pulldowns', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Neutral Grip Pull-Ups', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Weighted Pull-Ups', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pec Deck Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Push-Up Plus', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Dumbbell Press', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Dumbbell Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Resistance Band Flyes', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Low-to-High Cable Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'High-to-Low Cable Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Overhead Shrugs', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Rack Pulls', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Suitcase Carry', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Overhead Carry', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Rack Position Carry', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Spoto Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pin Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Board Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pause Bench', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'JM Press', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Skull Crushers', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Overhead Tricep Extension', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Rear Delt Flyes', reps: '12-15', sets: 3, isBodyweight: false },
];

// Barbell variations of a main lift, scaled as a % of that lift's training
// max — the rest of the accessory pool (leg press, cable flyes, etc.) has no
// natural %TM basis and isn't included. These are starting-point estimates,
// not prescriptions; a lifter should still adjust based on how the pause/
// range-of-motion/leverage change actually feels.
export const ACCESSORY_PCT_OF_TM: Record<string, { baseLift: 'squat' | 'bench' | 'deadlift'; pct: number }> = {
  'Box Squats': { baseLift: 'squat', pct: 0.70 },
  'Pause Squats': { baseLift: 'squat', pct: 0.75 },
  'Front Squats': { baseLift: 'squat', pct: 0.65 },
  'Anderson Squats': { baseLift: 'squat', pct: 0.65 },
  'Safety Bar Box Squats': { baseLift: 'squat', pct: 0.70 },
  'Tempo Squats': { baseLift: 'squat', pct: 0.60 },
  'Pin Squats': { baseLift: 'squat', pct: 0.70 },
  'Zercher Squats': { baseLift: 'squat', pct: 0.60 },
  'Safety Bar Squats': { baseLift: 'squat', pct: 0.80 },
  'High Bar Squats': { baseLift: 'squat', pct: 0.80 },
  'Spoto Press': { baseLift: 'bench', pct: 0.70 },
  'Pin Press': { baseLift: 'bench', pct: 0.70 },
  'Board Press': { baseLift: 'bench', pct: 0.85 },
  'Pause Bench': { baseLift: 'bench', pct: 0.80 },
  'Close-Grip Bench': { baseLift: 'bench', pct: 0.80 },
  'JM Press': { baseLift: 'bench', pct: 0.55 },
  'Rack Pulls': { baseLift: 'deadlift', pct: 0.90 },
};

export const weakPointExercisesMap: Record<string, Record<StickingPoint, string[]>> = {
  squat: {
    in_the_hole: ['Box Squats', 'Anderson Squats', 'Pin Squats', 'Pause Squats', 'Bulgarian Split Squats'],
    mid_range:   ['Pin Squats', 'Tempo Squats', 'Front Squats', 'Pause Squats', 'Leg Press'],
    lockout:     ['Walking Lunges', 'Single-Leg Squats', 'Safety Bar Box Squats', 'Leg Extensions', 'Hip Thrusts'],
  },
  bench: {
    in_the_hole: ['Incline DB Press', 'Board Press', 'Pin Press', 'Spoto Press', 'Pause Bench'],
    mid_range:   ['Close-Grip Bench', 'Pin Press', 'Pause Bench', 'Incline Bench', 'Floor Press'],
    lockout:     ['Floor Press', 'Board Press', 'Close-Grip Bench', 'Tricep Pressdowns', 'JM Press'],
  },
  deadlift: {
    in_the_hole: ['Box Squats', 'Anderson Squats', 'Pin Squats', 'Pin Pulls', 'Deadlift from Deficit'],
    mid_range:   ['Tempo Deadlifts', 'Paused Deadlifts', 'Pin Pulls', 'Partial Deadlifts', 'Rack Pulls'],
    lockout:     ['Rack Pulls', 'Pin Pulls', 'Partial Deadlifts', 'B Stance RDLs', 'Shrugs'],
  },
  upper: {
    in_the_hole: ['Incline DB Press', 'Board Press', 'Pin Press', 'Spoto Press', 'Pause Bench'],
    mid_range:   ['Close-Grip Bench', 'Pin Press', 'Pause Bench', 'JM Press', 'Floor Press'],
    lockout:     ['Floor Press', 'Board Press', 'Close-Grip Bench', 'Tricep Pressdowns', 'Lockout Bench'],
  },
};

export const generalSupportExercises: Record<string, string[]> = {
  squat:    ['Romanian Deadlift', 'Leg Curls', 'Barbell Rows', 'Plank', 'Calf Raises', 'Hip Thrusts', 'Farmer Walks'],
  bench:    ['Barbell Curls', 'Face Pulls', 'Chest Flyes', 'Cable Flyes', 'Dips', 'Chin-Ups', 'Pull-Ups'],
  deadlift: ['Romanian Deadlift', 'Leg Curls', 'Abs', 'Farmer Walks', 'Shrugs', 'Back Extensions', 'Nordic Curls'],
  upper:    ['Face Pulls', 'Lateral Raise Complex', 'Chest Flyes', 'Cable Flyes', 'Dips', 'Chin-Ups', 'Pull-Ups'],
};

export function selectMixedAccessories(
  liftType: string,
  weakPoints: StickingPoint[] | undefined,
  excludeExercises: string[] = []
): string[] {
  const allExercises = weakPointExercisesMap[liftType];
  const generalExercises = generalSupportExercises[liftType];

  if (!allExercises || !generalExercises) return [];

  const selected: string[] = [];
  const availableWeak = new Set<string>();
  const availableGeneral = generalExercises.filter(e => !excludeExercises.includes(e));

  if (weakPoints && weakPoints.length > 0) {
    weakPoints.forEach(point => {
      allExercises[point].forEach(ex => {
        if (!excludeExercises.includes(ex)) availableWeak.add(ex);
      });
    });
  }

  const numWeakPointExercises = weakPoints && weakPoints.length > 0 ? Math.min(2, availableWeak.size) : 0;
  let weakPointCount = 0;
  availableWeak.forEach(ex => {
    if (weakPointCount < numWeakPointExercises) { selected.push(ex); weakPointCount++; }
  });

  for (const ex of availableGeneral) {
    if (selected.length >= 4) break;
    if (!selected.includes(ex)) selected.push(ex);
  }

  return selected;
}
