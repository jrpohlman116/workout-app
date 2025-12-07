/*
  # Add Program Variation Support

  1. Changes
    - Add `program_variation` column to `user_profiles` table
    - Column allows three values: 'standard', 'bbb' (Boring But Big), 'bbs' (Boring But Strong)
    - Default value set to 'standard' for all users
    - Users can switch variations mid-cycle without restarting

  2. Program Variations
    - Standard: Traditional 5/3/1 with 4 accessory exercises
    - BBB (Boring But Big): Main lift + 5x10 supplemental at 50% TM + 2 minimal accessories
    - BBS (Boring But Strong): Main lift + 10x5 supplemental at FSL weight + 2 minimal accessories

  3. Notes
    - No data migration needed, existing users default to 'standard'
    - Supplemental work uses the same lift as the main movement
    - RLS policies already cover this column through existing user policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'program_variation'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN program_variation text DEFAULT 'standard' 
    CHECK (program_variation IN ('standard', 'bbb', 'bbs'));
  END IF;
END $$;