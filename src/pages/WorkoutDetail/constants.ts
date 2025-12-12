export const liftNames: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
  ohp: 'Overhead Press',
};

export const liftNamesShort: Record<string, string> = {
  squat: 'Squat',
  bench: 'Benchpress',
  deadlift: 'Deadlift',
  ohp: 'Overhead Press',
};

export const baseExercises = {
  squat: [
    { name: 'Romanian Deadlift', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Bulgarian Split Squats', reps: '8-10', sets: 3, isBodyweight: false },
    { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Plank', reps: '30-60 sec', sets: 3, isBodyweight: true },
  ],
  bench: [
    { name: 'Incline DB Press', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Barbell Curls', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Tricep Pressdowns', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
  ],
  deadlift: [
    { name: 'Leg Press', reps: '5-8', sets: 3, isBodyweight: false },
    { name: 'B Stance RDLs', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15 min', sets: 3, isBodyweight: true },
  ],
  ohp: [
    { name: 'Close-Grip Bench', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Lat Pull-Overs', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Lateral Raise Complex', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Rear Delt Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  ],
};

export const bbbExercises = {
  squat: [
    { name: 'Bulgarian Split Squats', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15', sets: 3, isBodyweight: true },
  ],
  bench: [
    { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
  ],
  deadlift: [
    { name: 'B Stance RDLs', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15', sets: 3, isBodyweight: true },
  ],
  ohp: [
    { name: 'Pull-Ups', reps: '6-10', sets: 3, isBodyweight: true },
    { name: 'Lateral Raise Complex', reps: '12-15', sets: 3, isBodyweight: false },
  ],
};

export const bbsExercises = {
  squat: [
    { name: 'Bulgarian Split Squats', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15', sets: 3, isBodyweight: true },
  ],
  bench: [
    { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
  ],
  deadlift: [
    { name: 'B Stance RDLs', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15', sets: 3, isBodyweight: true },
  ],
  ohp: [
    { name: 'Pull-Ups', reps: '6-10', sets: 3, isBodyweight: true },
    { name: 'Lateral Raise Complex', reps: '12-15', sets: 3, isBodyweight: false },
  ],
};
