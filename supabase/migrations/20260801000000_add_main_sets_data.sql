/*
  # Add per-set data (weight/reps/RPE/VBT) to workout_sessions

  ## Summary
  workout_sessions previously only stored the derived top set
  (weight_lifted, reps_performed, calculated_1rm) plus a single
  session-level `rpe`. There was nowhere to attach optional per-set RPE or
  VBT (velocity-based training / bar speed) readings to the main lift's
  other top sets, since individual set data was never persisted server-side
  for the main lift (unlike accessory_exercises.sets_data).

  ## Changes to `workout_sessions`

  1. `main_sets_data` (jsonb, nullable)
     - Snapshot of the main lift's top sets at save time: an array of
       { reps: string, weight: string, rpe?: string, vbt?: string }
     - rpe: Rate of Perceived Exertion (1-10), optional per set
     - vbt: mean concentric bar velocity in m/s, optional per set
     - Null for sessions logged before this migration and for upper-body
       days (no main lift)

  ## Notes
  - Nullable, no data migration required, existing rows are unaffected
  - RLS policies already cover this column through existing user policies
    on workout_sessions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'main_sets_data'
  ) THEN
    ALTER TABLE workout_sessions ADD COLUMN main_sets_data jsonb;
  END IF;
END $$;
