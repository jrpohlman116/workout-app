/*
  # Add dark mode preference

  1. Changes
    - Add `dark_mode` column to `user_profiles` table
    - Default value is `false` (light mode)
    - Users can toggle between light and dark mode

  2. Notes
    - This is a user preference setting
    - No security changes needed as users can only update their own profile
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'dark_mode'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN dark_mode boolean DEFAULT false;
  END IF;
END $$;
