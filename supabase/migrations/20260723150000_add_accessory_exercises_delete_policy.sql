/*
  # Add DELETE policy to accessory_exercises

  1. Bug
    - accessory_exercises has SELECT and INSERT policies but no DELETE policy.
    - WorkoutDetail's handleComplete relies on delete-before-insert for
      idempotent retries ("delete before insert: idempotent on retry, no-op
      on first call") — with RLS enabled and no DELETE policy, that delete
      silently affects zero rows instead of erroring, so a retry after a
      partial save failure duplicates accessory rows for the same
      workout_session_id instead of replacing them.
    - Not a cross-user leak — RLS still correctly scopes everything else.
      A same-user data-integrity bug. Found during the 2026-07-23 security
      review (see workout-app-vault/02 - Architecture/Security Review -
      2026-07-23.md).

  2. Fix
    - Add a DELETE policy mirroring the existing SELECT/INSERT shape —
      ownership verified by joining through workout_sessions.user_id,
      matching how workout_templates already has full CRUD.
*/

CREATE POLICY "Users can delete own accessory exercises"
  ON accessory_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = accessory_exercises.workout_session_id
      AND workout_sessions.user_id = (select auth.uid())
    )
  );
