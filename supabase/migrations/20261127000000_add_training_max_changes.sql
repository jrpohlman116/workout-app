/*
  # Training max history (UX overhaul, phase 1)

  Records every training max change, so the Progress chart and the training
  max sheet can show where a TM came from. After the week 3 AMRAP the app
  applies the new TM automatically through `apply_training_max_change`, which
  writes the history row and the profile in one transaction.

  ## New table `training_max_changes`
  - `lift`: squat | bench | deadlift | ohp
  - `old_tm`, `new_tm`: training maxes before and after (old_tm is null for `start`)
  - `reason`: start | increase | hold | decrease | manual | reset
  - `amrap_weight`, `amrap_reps`, `e1rm`: the AMRAP behind an automatic change
  - `explanation`: the sentence shown to the lifter
  - `cycle_index`: the wave the change closed (block.cycleIndex)
  - RLS: users read and insert their own rows. No update or delete policy, so
    the history can't be rewritten from the client; rows go with the account
    (ON DELETE CASCADE).

  ## Backfill
  One `start` row per lift from the current *_max columns, for profiles with
  a max and no history yet for that lift. Overhead press only counts with a
  tested max (see trainingMaxFor: ohp_max held a 135 placeholder).

  ## New function `apply_training_max_change`
  SECURITY INVOKER, so the caller's RLS applies. Locks the caller's profile
  row, reads the current TM as `old_tm`, sets the new TM and inserts the
  history row. Returns the row.

  ## Notes
  - convert_user_units doesn't convert this table yet; a unit switch leaves
    history in the old unit (see the phase 1 PR).
  - Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS training_max_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  lift text NOT NULL CHECK (lift IN ('squat', 'bench', 'deadlift', 'ohp')),
  old_tm numeric,
  new_tm numeric NOT NULL CHECK (new_tm > 0),
  reason text NOT NULL CHECK (reason IN ('start', 'increase', 'hold', 'decrease', 'manual', 'reset')),
  amrap_weight numeric,
  amrap_reps smallint,
  e1rm numeric,
  explanation text,
  cycle_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_max_changes_user_lift_created_idx
  ON training_max_changes (user_id, lift, created_at);

ALTER TABLE training_max_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own training max changes" ON training_max_changes;
DROP POLICY IF EXISTS "Users can insert own training max changes" ON training_max_changes;

CREATE POLICY "Users can read own training max changes"
  ON training_max_changes FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own training max changes"
  ON training_max_changes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Backfill: one start row per lift that has a max and no history yet.
INSERT INTO training_max_changes (user_id, lift, old_tm, new_tm, reason, explanation)
SELECT p.id, l.lift, NULL, l.tm, 'start', 'Starting training max.'
FROM user_profiles p
CROSS JOIN LATERAL (VALUES
  ('squat', p.squat_max),
  ('bench', p.bench_max),
  ('deadlift', p.deadlift_max),
  ('ohp', CASE WHEN COALESCE(p.ohp_tested_max, 0) > 0 THEN p.ohp_max END)
) AS l(lift, tm)
WHERE COALESCE(l.tm, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM training_max_changes c WHERE c.user_id = p.id AND c.lift = l.lift
  );

CREATE OR REPLACE FUNCTION apply_training_max_change(
  p_lift text,
  p_new_tm numeric,
  p_reason text,
  p_amrap_weight numeric DEFAULT NULL,
  p_amrap_reps smallint DEFAULT NULL,
  p_e1rm numeric DEFAULT NULL,
  p_explanation text DEFAULT NULL,
  p_cycle_index integer DEFAULT NULL
)
RETURNS training_max_changes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old numeric;
  v_row training_max_changes;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF p_lift NOT IN ('squat', 'bench', 'deadlift', 'ohp') THEN
    RAISE EXCEPTION 'Unknown lift: %', p_lift;
  END IF;

  SELECT CASE p_lift
           WHEN 'squat' THEN squat_max
           WHEN 'bench' THEN bench_max
           WHEN 'deadlift' THEN deadlift_max
           ELSE ohp_max
         END
    INTO v_old
  FROM user_profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile for the current user';
  END IF;

  UPDATE user_profiles SET
    squat_max    = CASE WHEN p_lift = 'squat'    THEN p_new_tm ELSE squat_max END,
    bench_max    = CASE WHEN p_lift = 'bench'    THEN p_new_tm ELSE bench_max END,
    deadlift_max = CASE WHEN p_lift = 'deadlift' THEN p_new_tm ELSE deadlift_max END,
    ohp_max      = CASE WHEN p_lift = 'ohp'      THEN p_new_tm ELSE ohp_max END,
    updated_at   = now()
  WHERE id = v_uid;

  INSERT INTO training_max_changes
    (user_id, lift, old_tm, new_tm, reason, amrap_weight, amrap_reps, e1rm, explanation, cycle_index)
  VALUES
    (v_uid, p_lift, v_old, p_new_tm, p_reason, p_amrap_weight, p_amrap_reps, p_e1rm, p_explanation, p_cycle_index)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION apply_training_max_change(text, numeric, text, numeric, smallint, numeric, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION apply_training_max_change(text, numeric, text, numeric, smallint, numeric, text, integer) TO authenticated;
