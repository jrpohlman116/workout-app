/*
  # 5-3-1 Workout Program Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `squat_max` (numeric) - User's 1 rep max for squat
      - `bench_max` (numeric) - User's 1 rep max for bench press
      - `deadlift_max` (numeric) - User's 1 rep max for deadlift
      - `ohp_max` (numeric) - User's 1 rep max for overhead press
      - `current_cycle` (integer) - Current training cycle number
      - `current_week` (integer) - Current week in the cycle (1-4)
      - `onboarding_completed` (boolean) - Whether user has completed onboarding
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `workout_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `lift_type` (text) - Type of lift: squat, bench, deadlift, ohp
      - `cycle` (integer) - Cycle number
      - `week` (integer) - Week number (1-4)
      - `weight_lifted` (numeric) - Weight used in the session
      - `reps_performed` (integer) - Reps performed
      - `calculated_1rm` (numeric) - Calculated 1 rep max using Epley formula
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  squat_max numeric DEFAULT 0,
  bench_max numeric DEFAULT 0,
  deadlift_max numeric DEFAULT 0,
  ohp_max numeric DEFAULT 0,
  current_cycle integer DEFAULT 1,
  current_week integer DEFAULT 1,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  lift_type text NOT NULL,
  cycle integer NOT NULL,
  week integer NOT NULL,
  weight_lifted numeric NOT NULL,
  reps_performed integer NOT NULL,
  calculated_1rm numeric NOT NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workout sessions"
  ON workout_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_lift_type ON workout_sessions(lift_type);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(completed_at);