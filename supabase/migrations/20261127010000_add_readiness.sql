/*
  # Readiness (UX overhaul, phase 2)

  Training-based readiness is computed once a day, on first open, and stored
  per user and date. Sessions record the readiness and time limits they ran
  under, so capped sessions can be left out of the back-off rules.

  ## New table `readiness_days`
  - `user_id`, `date` (local calendar date): unique together
  - `score` (0-100), `state` (green | yellow | red)
  - `source`: training | wearable
  - `inputs` (jsonb): the signals and reason behind the reading
  - `overridden_to`: the state the lifter chose instead, when they overrode it
  - `checkin`: good | okay | rough, when given
  - RLS: users read, insert and update their own rows. No delete policy; rows
    go with the account (ON DELETE CASCADE).

  ## Changes to `workout_sessions`
  - `readiness_state` (text, green | yellow | red)
  - `readiness_score` (smallint, 0-100)
  - `time_available_min` (smallint, 30 | 45 | 60)
  - `backoffs_capped` (boolean, default false): readiness or time lowered the cap
  - `backoff_cap` (smallint): the cap the session ran with
  All nullable except `backoffs_capped`; existing rows are unaffected.

  ## Notes
  - Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS readiness_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  state text NOT NULL CHECK (state IN ('green', 'yellow', 'red')),
  source text NOT NULL DEFAULT 'training' CHECK (source IN ('training', 'wearable')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  overridden_to text CHECK (overridden_to IN ('green', 'yellow', 'red')),
  checkin text CHECK (checkin IN ('good', 'okay', 'rough')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE readiness_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own readiness days" ON readiness_days;
DROP POLICY IF EXISTS "Users can insert own readiness days" ON readiness_days;
DROP POLICY IF EXISTS "Users can update own readiness days" ON readiness_days;

CREATE POLICY "Users can read own readiness days"
  ON readiness_days FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own readiness days"
  ON readiness_days FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own readiness days"
  ON readiness_days FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'readiness_state') THEN
    ALTER TABLE workout_sessions ADD COLUMN readiness_state text
      CHECK (readiness_state IN ('green', 'yellow', 'red'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'readiness_score') THEN
    ALTER TABLE workout_sessions ADD COLUMN readiness_score smallint
      CHECK (readiness_score BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'time_available_min') THEN
    ALTER TABLE workout_sessions ADD COLUMN time_available_min smallint
      CHECK (time_available_min IN (30, 45, 60));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'backoffs_capped') THEN
    ALTER TABLE workout_sessions ADD COLUMN backoffs_capped boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'backoff_cap') THEN
    ALTER TABLE workout_sessions ADD COLUMN backoff_cap smallint CHECK (backoff_cap >= 0);
  END IF;
END $$;
