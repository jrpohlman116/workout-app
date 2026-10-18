/*
  # Track which wave the user last reviewed their weak points for

  ## Summary
  Weak points (sticking points per lift) drive accessory exercise selection
  but were previously set once (onboarding / Profile) and never revisited.
  This adds a pointer so the app can prompt a one-time-per-wave re-check at
  the boundary between training waves (10/8/5/3-rep) without nagging on
  every week advance.

  ## Changes to `user_profiles`

  1. `weak_points_reviewed_wave` (integer, nullable)
     - The rep-wave (10/8/5/3) the user last reviewed/confirmed weak points for
     - Null = never reviewed; app should prompt at the next wave boundary
     - Set whenever the user confirms (or edits) weak points at a wave-start
       prompt — compared against the upcoming wave to decide whether to prompt

  ## Notes
  - Nullable, no default — existing rows are unaffected and get prompted once
    at their next wave boundary
  - RLS policies already cover this column through existing user policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'weak_points_reviewed_wave'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN weak_points_reviewed_wave integer
    CHECK (weak_points_reviewed_wave IN (10, 8, 5, 3));
  END IF;
END $$;
