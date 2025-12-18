/*
  # Add Workout Templates Table

  1. New Tables
    - `workout_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - User who owns this template
      - `lift_type` (text) - Type of lift: squat, bench, deadlift, ohp
      - `program_variation` (text) - Program variation: standard, bbb, bbs
      - `exercises_data` (jsonb) - Array of exercise objects with name, reps, sets, isBodyweight
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `workout_templates` table
    - Users can only access their own templates
    - Policies for SELECT, INSERT, UPDATE, DELETE

  3. Constraints
    - Composite unique constraint on (user_id, lift_type, program_variation)
    - Ensures one template per user per lift type per variation
    - Maximum 7 exercises enforced at application level

  4. Indexes
    - Index on user_id for efficient queries
    - Index on lift_type for filtering
*/

CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lift_type text NOT NULL,
  program_variation text NOT NULL DEFAULT 'standard',
  exercises_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_templates_unique 
  ON workout_templates(user_id, lift_type, program_variation);

CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id 
  ON workout_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_workout_templates_lift_type 
  ON workout_templates(lift_type);

CREATE POLICY "Users can read own workout templates"
  ON workout_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout templates"
  ON workout_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout templates"
  ON workout_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout templates"
  ON workout_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);