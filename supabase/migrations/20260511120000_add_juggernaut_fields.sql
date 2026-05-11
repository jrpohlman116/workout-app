/*
  # Add Juggernaut Method Fields

  ## Summary
  Adds fields needed to support the Juggernaut-style program replacing 5/3/1.

  ## Changes to `user_profiles`

  1. `meet_date` (date, nullable)
     - Target meet or 1RM test date
     - Drives the wave schedule via buildWaveSchedule()
     - Null = no meet planned, app runs a default 16-week cycle

  2. `program_start_date` (date, nullable)
     - The date the current Juggernaut program started
     - Combined with meet_date, allows reconstructing the full wave schedule at any time

  3. `weak_points` (jsonb, nullable)
     - Sticking points per lift, self-reported by the user
     - Shape: { squat: string[], bench: string[], deadlift: string[] }
     - Valid values per array: 'in_the_hole', 'mid_range', 'lockout'
     - Null = no weak points set (app falls back to general accessory prescription)

  ## Changes to `workout_sessions`

  4. `wave` (integer, nullable)
     - Which Juggernaut rep wave the session belongs to: 10, 8, 5, or 3
     - Null for sessions logged before this migration (5/3/1 era)

  5. `phase` (text, nullable)
     - Which phase within the wave: 'accumulation', 'intensification', 'realization', 'deload'
     - Null for sessions logged before this migration

  6. `rpe` (smallint, nullable)
     - User-reported RPE (1–10) for the top set of the session
     - Used to calculate back-off set weight via calculateBackoffSets()
     - Null for sessions logged before this migration

  ## Notes
  - All new columns are nullable — no data migration required, existing rows are unaffected
  - RLS policies already cover these columns through existing user policies
  - `ohp_max` and `program_variation` are intentionally kept for now;
    they will be removed in a future migration once the UI is updated
*/

-- user_profiles: meet_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'meet_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN meet_date date;
  END IF;
END $$;

-- user_profiles: program_start_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'program_start_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN program_start_date date;
  END IF;
END $$;

-- user_profiles: weak_points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'weak_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN weak_points jsonb;
  END IF;
END $$;

-- workout_sessions: wave
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'wave'
  ) THEN
    ALTER TABLE workout_sessions
    ADD COLUMN wave integer
    CHECK (wave IN (10, 8, 5, 3));
  END IF;
END $$;

-- workout_sessions: phase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'phase'
  ) THEN
    ALTER TABLE workout_sessions
    ADD COLUMN phase text
    CHECK (phase IN ('accumulation', 'intensification', 'realization', 'deload'));
  END IF;
END $$;

-- workout_sessions: rpe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sessions' AND column_name = 'rpe'
  ) THEN
    ALTER TABLE workout_sessions
    ADD COLUMN rpe smallint
    CHECK (rpe >= 1 AND rpe <= 10);
  END IF;
END $$;
