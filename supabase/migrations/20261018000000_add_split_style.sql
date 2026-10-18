/*
  # Add accessory split style preference

  ## Changes to `user_profiles`

  1. `split_style` (text, nullable)
     - 'upper_lower' = cross-day accessory layout (squat variations on deadlift day)
     - 'full_body' = squat variations on the upper day, deadlift day general support only
     - Null = upper_lower (existing behavior)

  ## Notes
  - Nullable, no default — existing rows keep current behavior
  - RLS policies already cover this column through existing user policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'split_style'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN split_style text
    CHECK (split_style IN ('upper_lower', 'full_body'));
  END IF;
END $$;
