/*
  # Add sticking point to exercise substitutions

  1. Changes
    - `exercise_substitutions.sticking_point` (text[]) — which weak-point
      sticking point(s) ('in_the_hole' / 'mid_range' / 'lockout') the row's
      `original_exercise` addresses, mirroring `weakPointExercisesMap` in
      src/lib/exercises.ts. Empty array for general/isolation accessories
      with no weak-point relevance.

  2. Backfill
    - Populated for every existing row whose `original_exercise` is a
      weak-point exercise, based on the current weakPointExercisesMap.
    - Rows for general accessories (Romanian Deadlift, Leg Curls, Plank,
      Face Pulls, Barbell Rows, Abs, Lat Pull-Overs, etc.) are left as the
      empty-array default — they have no sticking-point relevance.

  3. Notes
    - This column documents the weakness a substitution addresses, matching
      the existing `muscle_groups` column's role — both are curated
      metadata on the row, not derived at query time.
    - The app itself does NOT read this column at runtime: substitution
      matching is computed from weakPointExercisesMap directly (the
      canonical source), cross-checked against per-exercise muscle-group
      tags in src/lib/exercises.ts. This column exists so the table stays
      self-describing for anyone browsing Supabase directly, and so future
      substitution rows can be authored with the weak point in mind.
*/

ALTER TABLE exercise_substitutions
  ADD COLUMN IF NOT EXISTS sticking_point text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE exercise_substitutions SET sticking_point = ARRAY['in_the_hole'] WHERE original_exercise = 'Bulgarian Split Squats';
UPDATE exercise_substitutions SET sticking_point = ARRAY['mid_range'] WHERE original_exercise = 'Leg Press';
UPDATE exercise_substitutions SET sticking_point = ARRAY['lockout'] WHERE original_exercise = 'B Stance RDLs';
UPDATE exercise_substitutions SET sticking_point = ARRAY['mid_range', 'lockout'] WHERE original_exercise = 'Close-Grip Bench';
UPDATE exercise_substitutions SET sticking_point = ARRAY['in_the_hole'] WHERE original_exercise = 'Incline DB Press';
UPDATE exercise_substitutions SET sticking_point = ARRAY['in_the_hole'] WHERE original_exercise = 'Box Squats';
UPDATE exercise_substitutions SET sticking_point = ARRAY['in_the_hole', 'mid_range'] WHERE original_exercise = 'Pause Squats';
UPDATE exercise_substitutions SET sticking_point = ARRAY['lockout'] WHERE original_exercise = 'Leg Extensions';
UPDATE exercise_substitutions SET sticking_point = ARRAY['in_the_hole', 'mid_range'] WHERE original_exercise = 'Front Squats';
UPDATE exercise_substitutions SET sticking_point = ARRAY['lockout'] WHERE original_exercise = 'Walking Lunges';
UPDATE exercise_substitutions SET sticking_point = ARRAY['lockout'] WHERE original_exercise = 'Hip Thrusts';
UPDATE exercise_substitutions SET sticking_point = ARRAY['lockout'] WHERE original_exercise = 'Shrugs';
