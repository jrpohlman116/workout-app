export type StickingPoint = 'in_the_hole' | 'mid_range' | 'lockout';

export const weakPointExercisesMap: Record<string, Record<StickingPoint, string[]>> = {
  squat: {
    in_the_hole: [
      'Box Squats',
      'Anderson Squats',
      'Pin Squats',
      'Pause Squats',
      'Bulgarian Split Squats',
    ],
    mid_range: [
      'Pin Squats',
      'Tempo Squats',
      'Front Squats',
      'Pause Squats',
      'Leg Press',
    ],
    lockout: [
      'Walking Lunges',
      'Single-Leg Squats',
      'Safety Bar Box Squats',
      'Leg Extensions',
      'Hip Thrusts',
    ],
  },
  bench: {
    in_the_hole: [
      'Incline DB Press',
      'Board Press',
      'Pin Press',
      'Spoto Press',
      'Paused Bench',
    ],
    mid_range: [
      'Close-Grip Bench',
      'Pin Press',
      'Pause Bench',
      'Incline Bench',
      'Floor Press',
    ],
    lockout: [
      'Floor Press',
      'Board Press',
      'Close-Grip Bench',
      'Tricep Pressdowns',
      'JM Press',
    ],
  },
  deadlift: {
    in_the_hole: [
      'Box Squats',
      'Anderson Squats',
      'Pin Squats',
      'Pin Pulls',
      'Deadlift from Deficit',
    ],
    mid_range: [
      'Tempo Deadlifts',
      'Paused Deadlifts',
      'Pin Pulls',
      'Partial Deadlifts',
      'Rack Pulls',
    ],
    lockout: [
      'Rack Pulls',
      'Pin Pulls',
      'Partial Deadlifts',
      'B Stance RDLs',
      'Shrugs',
    ],
  },
  upper: {
    // Upper day focuses on bench weak points
    in_the_hole: [
      'Incline DB Press',
      'Board Press',
      'Pin Press',
      'Spoto Press',
      'Paused Bench',
    ],
    mid_range: [
      'Close-Grip Bench',
      'Pin Press',
      'Pause Bench',
      'JM Press',
      'Floor Press',
    ],
    lockout: [
      'Floor Press',
      'Board Press',
      'Close-Grip Bench',
      'Tricep Pressdowns',
      'Lockout Bench',
    ],
  },
};

// General support exercises for each lift (not weak-point specific)
export const generalSupportExercises: Record<string, string[]> = {
  squat: [
    'Romanian Deadlift',
    'Leg Curls',
    'Barbell Rows',
    'Plank',
    'Calf Raises',
    'Hip Thrusts',
    'Farmer Walks',
  ],
  bench: [
    'Barbell Curls',
    'Face Pulls',
    'Chest Flyes',
    'Cable Flyes',
    'Dips',
    'Chin-Ups',
    'Pull-Ups',
  ],
  deadlift: [
    'Romanian Deadlift',
    'Leg Curls',
    'Abs',
    'Farmer Walks',
    'Shrugs',
    'Back Extensions',
    'Nordic Curls',
  ],
  upper: [
    'Face Pulls',
    'Lateral Raise Complex',
    'Chest Flyes',
    'Cable Flyes',
    'Dips',
    'Chin-Ups',
    'Pull-Ups',
  ],
};

/**
 * Selects a mix of weak-point-targeted and general support exercises.
 * Returns 4 exercises for a balanced session:
 * - 1-2 weak-point-targeted exercises based on user's sticking points
 * - 2-3 general support exercises
 */
export function selectMixedAccessories(
  liftType: string,
  weakPoints: StickingPoint[] | undefined,
  excludeExercises: string[] = []
): string[] {
  const allExercises = weakPointExercisesMap[liftType];
  const generalExercises = generalSupportExercises[liftType];

  if (!allExercises || !generalExercises) {
    return [];
  }

  const selected: string[] = [];
  const availableWeak = new Set<string>();
  const availableGeneral = generalExercises.filter(e => !excludeExercises.includes(e));

  // Collect weak-point-targeted exercises
  if (weakPoints && weakPoints.length > 0) {
    weakPoints.forEach(point => {
      allExercises[point].forEach(ex => {
        if (!excludeExercises.includes(ex)) {
          availableWeak.add(ex);
        }
      });
    });
  }

  // Add 1-2 weak-point exercises if available
  const numWeakPointExercises = weakPoints && weakPoints.length > 0 ? Math.min(2, availableWeak.size) : 0;
  let weakPointCount = 0;
  availableWeak.forEach(ex => {
    if (weakPointCount < numWeakPointExercises) {
      selected.push(ex);
      weakPointCount++;
    }
  });

  // Fill remaining slots with general support (up to 4 total)
  const targetCount = 4;
  let genCount = 0;
  for (const ex of availableGeneral) {
    if (selected.length >= targetCount) break;
    if (!selected.includes(ex)) {
      selected.push(ex);
      genCount++;
    }
  }

  return selected;
}
