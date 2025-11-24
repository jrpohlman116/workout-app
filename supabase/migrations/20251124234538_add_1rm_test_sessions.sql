/*
  # Add 1RM Test Session Support

  1. Changes
    - Add `is_1rm_test` boolean column to `workout_sessions` table
    - Add `notes` text column for storing test details and warm-up notes
    - Set default value for `is_1rm_test` to false
    - Add index on `is_1rm_test` for efficient filtering
  
  2. Purpose
    - Allow users to record dedicated 1RM testing sessions
    - Distinguish between estimated 1RMs (from AMRAP sets) and actual tested 1RMs
    - Store notes about warm-up progression and test conditions
    - Enable filtering and display of test sessions separately from regular training
  
  3. Notes
    - Existing sessions will have `is_1rm_test` set to false by default
    - Test sessions will still update progress tracking but be marked differently
    - Notes field is optional and can store JSON or plain text
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'is_1rm_test'
  ) THEN
    ALTER TABLE workout_sessions ADD COLUMN is_1rm_test boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE workout_sessions ADD COLUMN notes text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_is_1rm_test ON workout_sessions(is_1rm_test);
