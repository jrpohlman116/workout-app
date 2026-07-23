/*
  # Add CHECK constraints on core lifting numbers

  1. Bug
    - None of workout_sessions.weight_lifted / reps_performed / calculated_1rm,
      or user_profiles' six max/tested-max columns and bodyweight, had any
      bound at the database level — negative or nonsensical values were
      accepted. The app's own typed-input paths could already save a
      negative weight (see the paired "clamp negative values" fix), and a
      direct API call bypasses client-side validation entirely regardless.
      Found in the 2026-07-23 security review (see workout-app-vault/02 -
      Architecture/Security Review - 2026-07-23.md, "Input validation and
      sanitization").
    - The codebase already uses this pattern successfully elsewhere: `rpe`,
      `workout_perceptions.perceived_exertion`, and
      `progress_predictions.confidence_score` are all bounded. This just
      extends it to the columns that actually matter most.

  2. Bounds chosen
    - weight_lifted >= 0, not > 0: verified against live data first — upper
      (accessory-only) day sessions legitimately log weight_lifted = 0 and
      reps_performed = 0, since there's no main lift on that day. A strict
      > 0 bound would have rejected real, already-existing rows and broken
      every future upper-day workout completion.
    - reps_performed >= 0: 0 is legitimate for a missed 1RM-test attempt
      (see OneRepMaxTest.tsx) as well as upper-day sessions.
    - calculated_1rm >= 0: 0 for a missed 1RM-test attempt, otherwise positive.
    - The three *_tested_max columns are nullable with no default (unset
      until a lifter records one) — a plain `>= 0` CHECK already passes NULL
      under normal Postgres CHECK semantics, so no extra IS NULL clause is
      needed.
    - squat_max / bench_max / deadlift_max / bodyweight all default to 0 for
      a brand-new profile row (see AuthContext.tsx's insert-with-defaults
      profile creation) — >= 0 accommodates that starting state.
    - Checked live data before writing this migration: zero existing rows
      violate any of these bounds except the one upper-day session already
      accounted for above.
*/

ALTER TABLE workout_sessions
  ADD CONSTRAINT weight_lifted_non_negative CHECK (weight_lifted >= 0),
  ADD CONSTRAINT reps_performed_non_negative CHECK (reps_performed >= 0),
  ADD CONSTRAINT calculated_1rm_non_negative CHECK (calculated_1rm >= 0);

ALTER TABLE user_profiles
  ADD CONSTRAINT squat_max_non_negative CHECK (squat_max >= 0),
  ADD CONSTRAINT bench_max_non_negative CHECK (bench_max >= 0),
  ADD CONSTRAINT deadlift_max_non_negative CHECK (deadlift_max >= 0),
  ADD CONSTRAINT squat_tested_max_non_negative CHECK (squat_tested_max >= 0),
  ADD CONSTRAINT bench_tested_max_non_negative CHECK (bench_tested_max >= 0),
  ADD CONSTRAINT deadlift_tested_max_non_negative CHECK (deadlift_tested_max >= 0),
  ADD CONSTRAINT bodyweight_non_negative CHECK (bodyweight >= 0);
