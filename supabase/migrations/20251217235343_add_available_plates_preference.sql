/*
  # Add Available Plates Preference

  1. Changes
    - Add `available_plates_lb` column to store which lb plates the user has
    - Add `available_plates_kg` column to store which kg plates the user has
    - Both columns store JSON arrays of plate weights
  
  2. Notes
    - Default lb plates: [45, 35, 25, 10, 5, 2.5]
    - Default kg plates: [25, 20, 15, 10, 5, 2.5, 1.25]
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'available_plates_lb'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN available_plates_lb jsonb DEFAULT '[45, 35, 25, 10, 5, 2.5]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'available_plates_kg'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN available_plates_kg jsonb DEFAULT '[25, 20, 15, 10, 5, 2.5, 1.25]'::jsonb;
  END IF;
END $$;