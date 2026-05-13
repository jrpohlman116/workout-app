-- Add tested/competition max columns to user_profiles.
-- squat_max / bench_max / deadlift_max remain the Training Max (= tested × 0.90).
-- These new columns store the best actual 1RM the lifter has performed.

alter table user_profiles
  add column if not exists squat_tested_max    numeric,
  add column if not exists bench_tested_max    numeric,
  add column if not exists deadlift_tested_max numeric;
