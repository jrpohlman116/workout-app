/*
  # Overhead press day (rollout step 3b)

  The 4-day Juggernaut layout swaps the accessory-only "upper" day for an
  overhead press day. See "SDD - Multi-program architecture".

  ## Changes

  1. `workout_templates`: re-key custom accessory lists from the `upper` day
     to the `ohp` day (`lift_type` and `day_id`), so they carry over. A user
     who somehow already has an `ohp` template for the same variation keeps
     it and the old `upper` row is left alone.
  2. `user_profiles.ohp_max`: default becomes NULL (was 0), and the
     placeholder values are cleared. Before any screen let a user enter an
     overhead press max, nearly every profile (191 of 194 on the live
     database) held exactly 135, and none had a tested max. The app already
     ignores an OHP max without a tested max, so this only tidies the data.

  ## Notes
  - Past `upper` sessions are untouched; they stay in history as before.
  - Safe to re-run.
*/

UPDATE workout_templates t
SET lift_type = 'ohp', day_id = 'ohp'
WHERE t.lift_type = 'upper'
  AND NOT EXISTS (
    SELECT 1 FROM workout_templates o
    WHERE o.user_id = t.user_id
      AND o.lift_type = 'ohp'
      AND o.program_variation = t.program_variation
  );

ALTER TABLE user_profiles ALTER COLUMN ohp_max SET DEFAULT NULL;

UPDATE user_profiles
SET ohp_max = NULL
WHERE ohp_tested_max IS NULL
  AND ohp_max IN (0, 135);
