/*
  # Training profile fields (UX overhaul, phases 3 and 7)

  Onboarding asks for a goal and running days; Today remembers the time you
  usually have and how you like warm-ups shown. These were kept on the device
  until now.

  ## Changes to `user_profiles`
  - `training_goal` (text): compete | stronger | lift_and_run
  - `running_days_per_week` (text): 0 | 1-2 | 3+
  - `last_time_available` (smallint): 30 | 45 | 60, the Today time prompt's default
  - `warmup_display` (text, default 'collapsed'): collapsed | open | off
  - `rest_seconds` (jsonb, default {"warmup":60,"main":180,"accessory":90}),
    matching REST_TIMER_DEFAULTS
  All nullable or defaulted; existing rows are unaffected.

  ## Notes
  - Safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'training_goal') THEN
    ALTER TABLE user_profiles ADD COLUMN training_goal text
      CHECK (training_goal IN ('compete', 'stronger', 'lift_and_run'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'running_days_per_week') THEN
    ALTER TABLE user_profiles ADD COLUMN running_days_per_week text
      CHECK (running_days_per_week IN ('0', '1-2', '3+'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'last_time_available') THEN
    ALTER TABLE user_profiles ADD COLUMN last_time_available smallint
      CHECK (last_time_available IN (30, 45, 60));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'warmup_display') THEN
    ALTER TABLE user_profiles ADD COLUMN warmup_display text NOT NULL DEFAULT 'collapsed'
      CHECK (warmup_display IN ('collapsed', 'open', 'off'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles' AND column_name = 'rest_seconds') THEN
    ALTER TABLE user_profiles ADD COLUMN rest_seconds jsonb NOT NULL
      DEFAULT '{"warmup":60,"main":180,"accessory":90}'::jsonb;
  END IF;
END $$;
