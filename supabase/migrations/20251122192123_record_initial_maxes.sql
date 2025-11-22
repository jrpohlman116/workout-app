/*
  # Record Initial 1RM Maxes in Progress

  1. Changes
    - Creates initial workout session records for all existing users with their starting maxes
    - Records are dated at the user's account creation time
    - Only creates records for lifts where the max is greater than 0
    - Uses week 0 and cycle 0 to indicate these are baseline measurements

  2. Implementation
    - Inserts workout_sessions for existing users' initial maxes
    - Sets the completed_at timestamp to the user's created_at date
    - This provides historical context for progress tracking

  3. Notes
    - Only affects existing users who haven't had their initial maxes recorded
    - Future users will have this handled in the onboarding flow
*/

DO $$
BEGIN
  INSERT INTO workout_sessions (
    user_id,
    lift_type,
    cycle,
    week,
    weight_lifted,
    reps_performed,
    calculated_1rm,
    completed_at,
    created_at
  )
  SELECT
    up.id as user_id,
    lift.lift_type,
    0 as cycle,
    0 as week,
    lift.max_weight as weight_lifted,
    1 as reps_performed,
    lift.max_weight as calculated_1rm,
    up.created_at as completed_at,
    up.created_at as created_at
  FROM user_profiles up
  CROSS JOIN LATERAL (
    VALUES
      ('squat', up.squat_max),
      ('bench', up.bench_max),
      ('deadlift', up.deadlift_max),
      ('ohp', up.ohp_max)
  ) AS lift(lift_type, max_weight)
  WHERE lift.max_weight > 0
    AND NOT EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.user_id = up.id
        AND ws.lift_type = lift.lift_type
        AND ws.cycle = 0
        AND ws.week = 0
    );
END $$;
