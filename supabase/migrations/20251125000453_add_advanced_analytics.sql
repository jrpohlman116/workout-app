/*
  # Add Advanced Analytics System

  1. New Tables
    - `fatigue_indicators`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `week_start_date` (date) - Monday of the week
      - `weekly_volume` (numeric) - Total volume for the week
      - `weekly_intensity_average` (numeric) - Average intensity percentage
      - `training_stress_score` (numeric) - Calculated TSS (0-150 scale)
      - `acute_workload` (numeric) - Current week volume
      - `chronic_workload` (numeric) - 4-week rolling average
      - `acute_chronic_ratio` (numeric) - Acute/chronic ratio
      - `perceived_exertion` (integer) - User-reported fatigue (1-10)
      - `combined_fatigue_score` (numeric) - Weighted blend of objective and subjective
      - `fatigue_status` (text) - Status: fresh, optimal, moderate, high, severe
      - `recommended_action` (text) - Recovery recommendations
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `workout_perceptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `workout_session_id` (uuid, references workout_sessions)
      - `perceived_exertion` (integer) - Rating 1-10
      - `notes` (text) - Optional qualitative feedback
      - `created_at` (timestamptz)

    - `progress_predictions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `lift_type` (text) - squat, bench, deadlift, ohp
      - `generated_at` (timestamptz) - When prediction was calculated
      - `prediction_cycle_1` (numeric) - Predicted max 1 cycle ahead
      - `prediction_cycle_2` (numeric) - Predicted max 2 cycles ahead
      - `prediction_cycle_3` (numeric) - Predicted max 3 cycles ahead
      - `current_strength_tier` (text) - beginner, intermediate, advanced, elite
      - `improvement_velocity_percent` (numeric) - Expected gain per cycle
      - `confidence_score` (integer) - 0-100 confidence rating
      - `milestone_weights` (jsonb) - Target weights with projected dates
      - `calculation_metadata` (jsonb) - Explanation of calculation method
      - `created_at` (timestamptz)

  2. User Profile Updates
    - Add `analytics_unlocked` boolean to track 4-week requirement
    - Add `skip_fatigue_rating_count` to manage rating prompt frequency

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data

  4. Indexes
    - Index on user_id and week_start_date for fatigue queries
    - Index on user_id and lift_type for prediction queries
    - Index on workout_session_id for perception lookups
*/

-- Add analytics fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'analytics_unlocked'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN analytics_unlocked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'skip_fatigue_rating_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN skip_fatigue_rating_count integer DEFAULT 0;
  END IF;
END $$;

-- Create fatigue_indicators table
CREATE TABLE IF NOT EXISTS fatigue_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  weekly_volume numeric DEFAULT 0,
  weekly_intensity_average numeric DEFAULT 0,
  training_stress_score numeric DEFAULT 0,
  acute_workload numeric DEFAULT 0,
  chronic_workload numeric DEFAULT 0,
  acute_chronic_ratio numeric DEFAULT 0,
  perceived_exertion integer DEFAULT NULL,
  combined_fatigue_score numeric DEFAULT 0,
  fatigue_status text DEFAULT 'optimal',
  recommended_action text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

ALTER TABLE fatigue_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own fatigue indicators"
  ON fatigue_indicators FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fatigue indicators"
  ON fatigue_indicators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fatigue indicators"
  ON fatigue_indicators FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fatigue_indicators_user_week ON fatigue_indicators(user_id, week_start_date);

-- Create workout_perceptions table
CREATE TABLE IF NOT EXISTS workout_perceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  workout_session_id uuid REFERENCES workout_sessions ON DELETE CASCADE NOT NULL,
  perceived_exertion integer NOT NULL CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(workout_session_id)
);

ALTER TABLE workout_perceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workout perceptions"
  ON workout_perceptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout perceptions"
  ON workout_perceptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout perceptions"
  ON workout_perceptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_perceptions_session ON workout_perceptions(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_workout_perceptions_user ON workout_perceptions(user_id);

-- Create progress_predictions table
CREATE TABLE IF NOT EXISTS progress_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  lift_type text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  prediction_cycle_1 numeric DEFAULT 0,
  prediction_cycle_2 numeric DEFAULT 0,
  prediction_cycle_3 numeric DEFAULT 0,
  current_strength_tier text DEFAULT 'beginner',
  improvement_velocity_percent numeric DEFAULT 0,
  confidence_score integer DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  milestone_weights jsonb DEFAULT '{}'::jsonb,
  calculation_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE progress_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress predictions"
  ON progress_predictions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress predictions"
  ON progress_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress predictions"
  ON progress_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress predictions"
  ON progress_predictions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_progress_predictions_user_lift ON progress_predictions(user_id, lift_type);
CREATE INDEX IF NOT EXISTS idx_progress_predictions_generated ON progress_predictions(generated_at);
