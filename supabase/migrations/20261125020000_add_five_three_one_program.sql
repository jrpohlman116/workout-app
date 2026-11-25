/*
  # 5/3/1 program (rollout step 5)

  Allows `five_three_one` as a program. See "SDD - Multi-program architecture".

  ## Changes to `user_profiles`

  1. `program_id` CHECK widens from ('juggernaut') to ('juggernaut',
     'five_three_one'). Existing rows are all 'juggernaut' and unaffected.

  ## Notes
  - `workout_sessions.program_id` has no CHECK, so no change there.
  - 5/3/1 writes `wave = NULL` on sessions and uses the existing four phases,
    so the `wave` and `phase` constraints need no change.
  - Safe to re-run.
*/

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_program_id_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_program_id_check
  CHECK (program_id IN ('juggernaut', 'five_three_one'));
