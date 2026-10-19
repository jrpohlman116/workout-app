/*
  # Substitutions for newly added accessory exercises

  Adds exercise_substitutions rows for: Chest-Supported Rows, One-Arm DB Rows,
  Cable Rows, Good Mornings, Reverse Hyperextensions, Trap Bar Deadlifts,
  Ab Wheel, Pallof Press, Hanging Leg Raises, Overhead Press, Seated DB Press,
  Hammer Curls, Rope Pressdowns. The exercises themselves live in app code
  (src/lib/exercises.ts); this table only powers the "Sub" picker.
*/

INSERT INTO exercise_substitutions (original_exercise, substitute_exercise, description, equipment_needed, difficulty, muscle_groups) VALUES
  ('Chest-Supported Rows', 'One-Arm DB Rows', 'Unilateral row with bench support', 'Dumbbell and bench', 'similar', ARRAY['lats', 'upper back']),
  ('Chest-Supported Rows', 'Cable Rows', 'Seated cable row, constant tension', 'Cable machine', 'similar', ARRAY['lats', 'upper back']),
  ('Chest-Supported Rows', 'Barbell Rows', 'Bent-over row, more lower back demand', 'Barbell', 'harder', ARRAY['lats', 'upper back', 'lower back']),
  ('One-Arm DB Rows', 'Chest-Supported Rows', 'Row with chest supported on an incline bench', 'Dumbbells and incline bench', 'similar', ARRAY['lats', 'upper back']),
  ('One-Arm DB Rows', 'Cable Rows', 'Seated cable row', 'Cable machine', 'similar', ARRAY['lats', 'upper back']),
  ('Cable Rows', 'Chest-Supported Rows', 'Row with chest supported', 'Dumbbells and incline bench', 'similar', ARRAY['lats', 'upper back']),
  ('Cable Rows', 'One-Arm DB Rows', 'Unilateral dumbbell row', 'Dumbbell and bench', 'similar', ARRAY['lats', 'upper back']),

  ('Good Mornings', 'Romanian Deadlift', 'Hip hinge with barbell held in the hands', 'Barbell', 'similar', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Good Mornings', 'Reverse Hyperextensions', 'Machine or bench hip extension', 'Reverse hyper or bench', 'easier', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Good Mornings', 'Back Extensions', 'Bodyweight hip extension', 'Hyperextension bench', 'easier', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Reverse Hyperextensions', 'Back Extensions', 'Hip extension on a hyperextension bench', 'Hyperextension bench', 'similar', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Reverse Hyperextensions', 'Good Mornings', 'Barbell hip hinge', 'Barbell', 'harder', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Trap Bar Deadlifts', 'Rack Pulls', 'Partial-range pull from the rack', 'Barbell and rack', 'similar', ARRAY['glutes', 'lower back', 'traps']),
  ('Trap Bar Deadlifts', 'Deficit Deadlift', 'Conventional pull from a deficit', 'Barbell and plate', 'harder', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Trap Bar Deadlifts', 'Leg Press', 'Machine leg drive with less spinal load', 'Leg press machine', 'easier', ARRAY['quads', 'glutes']),

  ('Ab Wheel', 'Plank', 'Static anti-extension hold', 'Bodyweight', 'easier', ARRAY['core']),
  ('Ab Wheel', 'Hanging Leg Raises', 'Hanging core flexion', 'Pull-up bar', 'similar', ARRAY['core', 'hip flexors']),
  ('Pallof Press', 'Plank', 'Static anti-extension hold', 'Bodyweight', 'easier', ARRAY['core']),
  ('Pallof Press', 'Ab Wheel', 'Anti-extension rollout', 'Ab wheel', 'harder', ARRAY['core']),
  ('Hanging Leg Raises', 'Ab Wheel', 'Anti-extension rollout', 'Ab wheel', 'similar', ARRAY['core']),
  ('Hanging Leg Raises', 'Plank', 'Static core hold', 'Bodyweight', 'easier', ARRAY['core']),

  ('Overhead Press', 'Seated DB Press', 'Seated dumbbell overhead press', 'Dumbbells and bench', 'easier', ARRAY['shoulders', 'triceps']),
  ('Overhead Press', 'Dumbbell Press', 'Dumbbell press for the chest and shoulders', 'Dumbbells', 'easier', ARRAY['shoulders', 'triceps', 'chest']),
  ('Seated DB Press', 'Overhead Press', 'Standing barbell overhead press', 'Barbell', 'harder', ARRAY['shoulders', 'triceps']),
  ('Seated DB Press', 'Lateral Raise Complex', 'Lateral raise variation for side delts', 'Dumbbells', 'easier', ARRAY['shoulders']),
  ('Hammer Curls', 'Barbell Curls', 'Supinated barbell curl', 'Barbell', 'similar', ARRAY['biceps']),
  ('Hammer Curls', 'Chin-Ups', 'Bodyweight biceps-emphasized pull', 'Pull-up bar', 'harder', ARRAY['biceps', 'lats']),
  ('Rope Pressdowns', 'Tricep Pressdowns', 'Straight-bar pressdown', 'Cable machine', 'similar', ARRAY['triceps']),
  ('Rope Pressdowns', 'Overhead Tricep Extension', 'Overhead triceps extension', 'Dumbbell or cable', 'similar', ARRAY['triceps']);
