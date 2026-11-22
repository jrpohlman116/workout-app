/*
  # Track when the program was last restarted

  ## Changes to `user_profiles`

  1. `program_restarted_at` (timestamptz, nullable)
     - Set by "Save & restart program"; workouts completed before this
       moment no longer show as complete on the Home screen
     - Null = never restarted, every logged session counts

  ## Notes
  - Nullable, no default — existing rows keep current behavior
  - Workout history is untouched; only the "complete" badges are scoped
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'program_restarted_at'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN program_restarted_at timestamptz;
  END IF;
END $$;
