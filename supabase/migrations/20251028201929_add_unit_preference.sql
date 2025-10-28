/*
  # Add unit preference to user profiles

  1. Changes
    - Add `unit_preference` column to `user_profiles` table
      - Values: 'lb' or 'kg'
      - Default: 'lb' (most common for US users)
    
  2. Notes
    - Wilks formula requires kg, so we'll convert lb to kg before calculation
    - Users can switch between units in the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'unit_preference'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN unit_preference text DEFAULT 'lb' CHECK (unit_preference IN ('lb', 'kg'));
  END IF;
END $$;
