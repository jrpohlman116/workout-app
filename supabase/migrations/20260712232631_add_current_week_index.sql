/*
  # Add explicit current-week pointer for meet-date programs

  ## Summary
  Meet-date programs (buildWaveSchedule) previously derived "the current week"
  purely from wall-clock date vs. each WeekBlock's [startDate, endDate]. That
  meant finishing a week's workouts early (or late) never actually advanced
  the displayed program — only the calendar did. This adds an explicit pointer
  so advancing is driven by user action (completing/skipping a week), not date.

  ## Changes to `user_profiles`

  1. `current_week_index` (integer, nullable)
     - Index into the WeekBlock[] produced by buildWaveSchedule(program_start_date, meet_date)
     - Null = no explicit pointer set yet; app falls back to the date-based lookup
       (i.e. whichever week today's date falls into) as the initial position
     - Once set (by advancing or jumping weeks), the app uses this value instead
       of date, so progress no longer silently resets/skips based on calendar drift

  ## Notes
  - Nullable, no default — existing rows are unaffected and keep date-based behavior
    until the user explicitly advances a week for the first time
  - Not used by the non-meet-date fallback flow, which already tracks progress
    explicitly via current_cycle/current_week
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'current_week_index'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN current_week_index integer;
  END IF;
END $$;
