/*
  # Fix Accessory Exercises Security Issues

  1. Performance Improvements
    - Optimize RLS policies by caching auth.uid() result with SELECT subquery
    - Remove unused index on exercise_order column

  2. Changes Made
    - Drop and recreate "Users can read own accessory exercises" policy with optimized auth.uid()
    - Drop and recreate "Users can insert own accessory exercises" policy with optimized auth.uid()
    - Drop unused idx_accessory_exercises_exercise_order index

  3. Security
    - Maintains same security level while improving query performance
    - Prevents re-evaluation of auth.uid() for each row
*/

DROP POLICY IF EXISTS "Users can read own accessory exercises" ON accessory_exercises;
DROP POLICY IF EXISTS "Users can insert own accessory exercises" ON accessory_exercises;

CREATE POLICY "Users can read own accessory exercises"
  ON accessory_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = accessory_exercises.workout_session_id
      AND workout_sessions.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own accessory exercises"
  ON accessory_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = accessory_exercises.workout_session_id
      AND workout_sessions.user_id = (select auth.uid())
    )
  );

DROP INDEX IF EXISTS idx_accessory_exercises_exercise_order;
