/*
  # Add Bodyweight and Gender to User Profiles

  1. Changes to user_profiles table
    - Add `bodyweight` column (numeric) - User's bodyweight in pounds
    - Add `gender` column (text) - User's gender ('male' or 'female')
    - Both fields are required for accurate Wilks score calculation
  
  2. Security
    - No RLS changes needed, existing policies cover new columns
*/

-- Add bodyweight and gender columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bodyweight'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bodyweight numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN gender text DEFAULT 'male';
  END IF;
END $$;
