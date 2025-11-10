/*
  # Add Accessory Exercises Table

  1. New Tables
    - `accessory_exercises`
      - `id` (uuid, primary key)
      - `workout_session_id` (uuid, references workout_sessions)
      - `exercise_name` (text) - Name of the accessory exercise
      - `exercise_order` (integer) - Order in the workout (0-indexed)
      - `sets_data` (jsonb) - Array of sets with reps and weight [{reps: "10", weight: "135"}, ...]
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `accessory_exercises` table
    - Add policies for authenticated users to access their own accessory exercise data

  3. Notes
    - Stores accessory exercise data linked to workout sessions
    - Uses JSONB for flexible set data storage
    - Includes exercise order for proper display sequence
*/

CREATE TABLE IF NOT EXISTS accessory_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  exercise_order integer NOT NULL DEFAULT 0,
  sets_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accessory_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own accessory exercises"
  ON accessory_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = accessory_exercises.workout_session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own accessory exercises"
  ON accessory_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = accessory_exercises.workout_session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_accessory_exercises_workout_session_id ON accessory_exercises(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_accessory_exercises_exercise_order ON accessory_exercises(exercise_order);
