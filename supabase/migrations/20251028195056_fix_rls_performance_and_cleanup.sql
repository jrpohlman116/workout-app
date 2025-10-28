/*
  # Fix RLS Performance Issues and Database Cleanup

  1. Changes to RLS Policies
    - Replace `auth.uid()` with `(select auth.uid())` in all policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
    
  2. Index Cleanup
    - Remove unused indexes on workout_sessions table
    - Keep only the user_id index which is actively used
  
  3. Security Notes
    - All RLS policies maintain the same security guarantees
    - Only the performance optimization technique changes
    - Users can still only access their own data
*/

-- Drop and recreate user_profiles policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate workout_sessions policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can read own workout sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can insert own workout sessions" ON workout_sessions;

CREATE POLICY "Users can read own workout sessions"
  ON workout_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_workout_sessions_lift_type;
DROP INDEX IF EXISTS idx_workout_sessions_completed_at;
