/*
  # Multi-program architecture: program choice, days per week, OHP max

  See "SDD - Multi-program architecture" and "ITD - Multi-program architecture"
  (rollout step 2). Every existing user becomes Juggernaut, 4 days, so
  nothing changes for them until they pick something else.

  ## Changes to `user_profiles`

  1. `program_id` (text, default 'juggernaut') - which program the user runs
  2. `days_per_week` (smallint, default 4, 3 or 4) - training days per week
  3. `program_state` (jsonb, default {}) - program-specific carried state
  4. `ohp_max`, `ohp_tested_max` (numeric, nullable) - optional overhead
     press training max and tested max. `ohp_max` already exists in the
     original schema with default 0, so it is left as is; the app treats 0
     and null alike as "no max set".
  5. `weak_points_reviewed_cycle` (integer, nullable) - program-neutral
     replacement for `weak_points_reviewed_wave`. Backfilled from it
     (rep wave 10/8/5/3 -> cycle 0/1/2/3). The old column is kept and ignored
     until the cleanup step.

  ## Changes to `workout_sessions`

  1. `program_id` (text, default 'juggernaut')
  2. `day_id` (text, nullable) - backfilled from `lift_type`

  ## Changes to `workout_templates`

  1. `day_id` (text, nullable) - backfilled from `lift_type`. The unique
     index stays on `lift_type` until the day layout step re-keys templates.

  ## Notes
  - Adding a program means a new migration that extends the program_id CHECK.
  - RLS already covers these tables per user; no new policies needed.
  - Safe to re-run: every change is guarded.
*/

-- user_profiles ---------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'program_id') THEN
    ALTER TABLE user_profiles
      ADD COLUMN program_id text NOT NULL DEFAULT 'juggernaut'
      CHECK (program_id IN ('juggernaut'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'days_per_week') THEN
    ALTER TABLE user_profiles
      ADD COLUMN days_per_week smallint NOT NULL DEFAULT 4
      CHECK (days_per_week IN (3, 4));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'program_state') THEN
    ALTER TABLE user_profiles
      ADD COLUMN program_state jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'ohp_max') THEN
    ALTER TABLE user_profiles
      ADD COLUMN ohp_max numeric CHECK (ohp_max > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'ohp_tested_max') THEN
    ALTER TABLE user_profiles
      ADD COLUMN ohp_tested_max numeric CHECK (ohp_tested_max > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'weak_points_reviewed_cycle') THEN
    ALTER TABLE user_profiles ADD COLUMN weak_points_reviewed_cycle integer CHECK (weak_points_reviewed_cycle >= 0);

    -- Carry existing reviews over, if the old column exists (it is missing on
    -- databases where migration 20261006 was never applied).
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_profiles' AND column_name = 'weak_points_reviewed_wave') THEN
      EXECUTE $q$
        UPDATE user_profiles
        SET weak_points_reviewed_cycle = CASE weak_points_reviewed_wave
          WHEN 10 THEN 0 WHEN 8 THEN 1 WHEN 5 THEN 2 WHEN 3 THEN 3
        END
        WHERE weak_points_reviewed_wave IS NOT NULL
      $q$;
    END IF;
  END IF;
END $$;

-- workout_sessions ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'program_id') THEN
    ALTER TABLE workout_sessions ADD COLUMN program_id text NOT NULL DEFAULT 'juggernaut';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_sessions' AND column_name = 'day_id') THEN
    ALTER TABLE workout_sessions ADD COLUMN day_id text;
    UPDATE workout_sessions SET day_id = lift_type WHERE day_id IS NULL;
  END IF;
END $$;

-- workout_templates -----------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'workout_templates' AND column_name = 'day_id') THEN
    ALTER TABLE workout_templates ADD COLUMN day_id text;
    UPDATE workout_templates SET day_id = lift_type WHERE day_id IS NULL;
  END IF;
END $$;
