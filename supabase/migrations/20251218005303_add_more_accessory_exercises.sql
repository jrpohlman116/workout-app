/*
  # Add More Accessory Exercises and Substitutions

  1. New Exercise Substitutions Added
    - Box Squats - Squat variation focusing on posterior chain
    - Pause Squats - Tempo squat variation for strength development
    - Calf Raises - Calf isolation exercise
    - Hip Abduction - Hip isolation for glute medius
    - Leg Extensions - Quad isolation exercise
    - Front Squats - Quad-dominant squat variation
    - Goblet Squats - Beginner-friendly squat
    - Walking Lunges - Dynamic leg exercise
    - Seated Calf Raises - Soleus-focused calf exercise
    - Hip Thrusts - Glute-focused hip extension
    - Nordic Curls - Advanced hamstring exercise
    - Chin-Ups - Bicep-emphasized pull-up variation
    - Pull-Ups - Classic back exercise
    - Chest Flyes - Chest isolation
    - Cable Flyes - Constant tension chest isolation
    - Shrugs - Trap isolation
    - Farmer Walks - Grip and core exercise

  2. Benefits
    - Provides more variety for training customization
    - Includes substitutions for equipment limitations
    - Covers all major muscle groups comprehensively
    - Offers difficulty progressions for each exercise

  3. Notes
    - Each new exercise includes multiple substitution options
    - Substitutions maintain similar movement patterns and muscle groups
    - Difficulty levels help users choose appropriate progressions
*/

INSERT INTO exercise_substitutions (original_exercise, substitute_exercise, description, equipment_needed, difficulty, muscle_groups) VALUES
  ('Box Squats', 'Pause Squats', 'Squat with pause at bottom for strength development', 'Barbell', 'similar', ARRAY['quads', 'glutes', 'hamstrings']),
  ('Box Squats', 'Anderson Squats', 'Squat starting from pins in rack', 'Barbell and rack', 'harder', ARRAY['quads', 'glutes']),
  ('Box Squats', 'Goblet Squats', 'Front-loaded squat for quad emphasis', 'Dumbbell or Kettlebell', 'easier', ARRAY['quads', 'glutes']),
  ('Box Squats', 'Safety Bar Box Squats', 'Box squats with cambered bar', 'Safety squat bar', 'similar', ARRAY['quads', 'glutes', 'upper back']),

  ('Pause Squats', 'Box Squats', 'Controlled descent to box', 'Barbell and box', 'similar', ARRAY['quads', 'glutes', 'hamstrings']),
  ('Pause Squats', 'Tempo Squats', 'Slow eccentric and concentric', 'Barbell', 'similar', ARRAY['quads', 'glutes', 'hamstrings']),
  ('Pause Squats', 'Pin Squats', 'Squat to pins with pause', 'Barbell and rack', 'similar', ARRAY['quads', 'glutes']),
  ('Pause Squats', 'Front Squats', 'Front-loaded squat variation', 'Barbell', 'harder', ARRAY['quads', 'core', 'upper back']),

  ('Calf Raises', 'Seated Calf Raises', 'Targets soleus muscle more', 'Seated calf machine', 'similar', ARRAY['calves', 'soleus']),
  ('Calf Raises', 'Single-Leg Calf Raises', 'Unilateral calf work', 'Bodyweight or Dumbbell', 'harder', ARRAY['calves']),
  ('Calf Raises', 'Donkey Calf Raises', 'Bent-over calf raise variation', 'Partner or machine', 'similar', ARRAY['calves']),
  ('Calf Raises', 'Jump Rope', 'Dynamic calf training', 'Jump rope', 'easier', ARRAY['calves', 'cardio']),

  ('Hip Abduction', 'Lateral Band Walks', 'Banded hip abduction while walking', 'Resistance band', 'similar', ARRAY['glute medius', 'hip abductors']),
  ('Hip Abduction', 'Clamshells', 'Lying hip abduction exercise', 'Resistance band', 'easier', ARRAY['glute medius', 'hip abductors']),
  ('Hip Abduction', 'Fire Hydrants', 'Quadruped hip abduction', 'Bodyweight or band', 'easier', ARRAY['glute medius', 'hip abductors']),
  ('Hip Abduction', 'Cable Hip Abduction', 'Standing cable hip abduction', 'Cable machine', 'similar', ARRAY['glute medius', 'hip abductors']),

  ('Leg Extensions', 'Sissy Squats', 'Quad-isolation bodyweight exercise', 'Bodyweight', 'harder', ARRAY['quads']),
  ('Leg Extensions', 'Spanish Squats', 'Banded quad-focused squat', 'Resistance band', 'similar', ARRAY['quads']),
  ('Leg Extensions', 'Terminal Knee Extensions', 'Short-range knee extension with band', 'Resistance band', 'easier', ARRAY['quads', 'VMO']),
  ('Leg Extensions', 'Front Squats', 'Compound quad-dominant movement', 'Barbell', 'harder', ARRAY['quads', 'core']),

  ('Front Squats', 'Goblet Squats', 'Front-loaded squat with single weight', 'Dumbbell or Kettlebell', 'easier', ARRAY['quads', 'glutes', 'core']),
  ('Front Squats', 'Zercher Squats', 'Barbell held in elbow crooks', 'Barbell', 'similar', ARRAY['quads', 'core', 'upper back']),
  ('Front Squats', 'Safety Bar Squats', 'Front-loaded with cambered bar', 'Safety squat bar', 'similar', ARRAY['quads', 'glutes']),
  ('Front Squats', 'High Bar Squats', 'Back squat with upright torso', 'Barbell', 'similar', ARRAY['quads', 'glutes']),

  ('Goblet Squats', 'Bodyweight Squats', 'Air squats for beginners', 'Bodyweight', 'easier', ARRAY['quads', 'glutes']),
  ('Goblet Squats', 'Dumbbell Squats', 'Squats holding dumbbells at sides', 'Dumbbells', 'similar', ARRAY['quads', 'glutes']),
  ('Goblet Squats', 'Kettlebell Squats', 'Squats with kettlebell', 'Kettlebell', 'similar', ARRAY['quads', 'glutes']),
  ('Goblet Squats', 'Front Squats', 'Barbell front squat progression', 'Barbell', 'harder', ARRAY['quads', 'core']),

  ('Walking Lunges', 'Static Lunges', 'Stationary lunge in place', 'Dumbbells or Barbell', 'easier', ARRAY['quads', 'glutes']),
  ('Walking Lunges', 'Reverse Lunges', 'Step back lunge variation', 'Dumbbells or Barbell', 'similar', ARRAY['quads', 'glutes']),
  ('Walking Lunges', 'Bulgarian Split Squats', 'Single-leg with elevated rear foot', 'Dumbbells', 'harder', ARRAY['quads', 'glutes']),
  ('Walking Lunges', 'Step-Ups', 'Stepping up onto elevated surface', 'Dumbbells or Barbell', 'similar', ARRAY['quads', 'glutes']),

  ('Seated Calf Raises', 'Standing Calf Raises', 'Targets gastrocnemius more', 'Calf machine or barbell', 'similar', ARRAY['calves', 'gastrocnemius']),
  ('Seated Calf Raises', 'Leg Press Calf Raises', 'Calf raises on leg press', 'Leg press machine', 'similar', ARRAY['calves']),
  ('Seated Calf Raises', 'Single-Leg Seated Calf Raises', 'Unilateral seated calf work', 'Dumbbell', 'harder', ARRAY['calves', 'soleus']),
  ('Seated Calf Raises', 'Tibialis Raises', 'Anterior shin strengthening', 'Bodyweight or band', 'easier', ARRAY['tibialis anterior']),

  ('Hip Thrusts', 'Glute Bridges', 'Floor-based hip thrust', 'Barbell or Bodyweight', 'easier', ARRAY['glutes', 'hamstrings']),
  ('Hip Thrusts', 'Single-Leg Hip Thrusts', 'Unilateral hip thrust', 'Bodyweight or Dumbbell', 'harder', ARRAY['glutes', 'hamstrings', 'core']),
  ('Hip Thrusts', 'Cable Pull-Throughs', 'Hip hinge with cable', 'Cable machine', 'similar', ARRAY['glutes', 'hamstrings']),
  ('Hip Thrusts', 'Kettlebell Swings', 'Dynamic hip hinge movement', 'Kettlebell', 'similar', ARRAY['glutes', 'hamstrings', 'core']),

  ('Nordic Curls', 'Eccentric Leg Curls', 'Slow negative hamstring curls', 'Leg curl machine', 'easier', ARRAY['hamstrings']),
  ('Nordic Curls', 'Partner Hamstring Curls', 'Bodyweight hamstring curl with partner', 'Partner', 'similar', ARRAY['hamstrings']),
  ('Nordic Curls', 'Glute Ham Raise', 'Full hamstring exercise', 'GHD', 'similar', ARRAY['hamstrings', 'glutes']),
  ('Nordic Curls', 'Slider Hamstring Curls', 'Hamstring curls using floor sliders', 'Sliders', 'easier', ARRAY['hamstrings', 'core']),

  ('Chin-Ups', 'Pull-Ups', 'Overhand grip pull-up', 'Pull-up bar', 'similar', ARRAY['lats', 'biceps', 'upper back']),
  ('Chin-Ups', 'Assisted Chin-Ups', 'Band or machine-assisted chin-ups', 'Band or machine', 'easier', ARRAY['lats', 'biceps']),
  ('Chin-Ups', 'Underhand Lat Pulldowns', 'Cable pulldown with underhand grip', 'Cable machine', 'easier', ARRAY['lats', 'biceps']),
  ('Chin-Ups', 'Weighted Chin-Ups', 'Chin-ups with added weight', 'Weight belt and plates', 'harder', ARRAY['lats', 'biceps', 'upper back']),

  ('Pull-Ups', 'Chin-Ups', 'Underhand grip pull-up', 'Pull-up bar', 'similar', ARRAY['lats', 'biceps', 'upper back']),
  ('Pull-Ups', 'Lat Pulldowns', 'Cable pulldown exercise', 'Cable machine', 'easier', ARRAY['lats', 'biceps']),
  ('Pull-Ups', 'Neutral Grip Pull-Ups', 'Parallel grip pull-up', 'Pull-up bar', 'similar', ARRAY['lats', 'biceps', 'upper back']),
  ('Pull-Ups', 'Weighted Pull-Ups', 'Pull-ups with added weight', 'Weight belt and plates', 'harder', ARRAY['lats', 'biceps', 'upper back']),

  ('Chest Flyes', 'Cable Flyes', 'Constant tension chest flyes', 'Cable machine', 'similar', ARRAY['chest']),
  ('Chest Flyes', 'Pec Deck Flyes', 'Machine chest flyes', 'Pec deck machine', 'easier', ARRAY['chest']),
  ('Chest Flyes', 'Push-Up Plus', 'Push-up with scapular protraction', 'Bodyweight', 'easier', ARRAY['chest', 'serratus']),
  ('Chest Flyes', 'Dumbbell Press', 'Compound chest press', 'Dumbbells', 'similar', ARRAY['chest', 'shoulders', 'triceps']),

  ('Cable Flyes', 'Dumbbell Flyes', 'Free weight chest flyes', 'Dumbbells', 'similar', ARRAY['chest']),
  ('Cable Flyes', 'Resistance Band Flyes', 'Portable chest flye option', 'Resistance bands', 'easier', ARRAY['chest']),
  ('Cable Flyes', 'Low-to-High Cable Flyes', 'Angled cable flyes for upper chest', 'Cable machine', 'similar', ARRAY['upper chest']),
  ('Cable Flyes', 'High-to-Low Cable Flyes', 'Angled cable flyes for lower chest', 'Cable machine', 'similar', ARRAY['lower chest']),

  ('Shrugs', 'Farmer Walks', 'Loaded carry with trap engagement', 'Dumbbells or Farmer handles', 'similar', ARRAY['traps', 'forearms', 'core']),
  ('Shrugs', 'Overhead Shrugs', 'Shrugs with weight overhead', 'Barbell or Dumbbells', 'harder', ARRAY['traps', 'shoulders']),
  ('Shrugs', 'Rack Pulls', 'Partial deadlift emphasizing traps', 'Barbell', 'harder', ARRAY['traps', 'upper back', 'lower back']),
  ('Shrugs', 'Face Pulls', 'Upper back and rear delt exercise', 'Cable machine', 'similar', ARRAY['traps', 'rear delts', 'upper back']),

  ('Farmer Walks', 'Suitcase Carry', 'Single-arm loaded carry', 'Dumbbell or Kettlebell', 'similar', ARRAY['core', 'obliques', 'forearms']),
  ('Farmer Walks', 'Overhead Carry', 'Walking with weight overhead', 'Dumbbell or Kettlebell', 'harder', ARRAY['shoulders', 'core', 'traps']),
  ('Farmer Walks', 'Rack Position Carry', 'Front-loaded walking carry', 'Dumbbells or Kettlebells', 'similar', ARRAY['core', 'upper back', 'forearms']),
  ('Farmer Walks', 'Shrugs', 'Static trap exercise', 'Barbell or Dumbbells', 'easier', ARRAY['traps', 'upper back'])

ON CONFLICT DO NOTHING;
