/*
  # Add unit-conversion function for historical weight data

  ## Summary
  Switching lb/kg on the Body Stats tab previously only converted bodyweight
  and (client-side) training/tested maxes — every historical workout_sessions
  row and accessory_exercises set weight was left untouched, silently
  reinterpreted in the new unit (e.g. a 100 kg squat session would read as
  "100 lb" after switching to lb). Neither workout_sessions nor
  accessory_exercises has a `FOR UPDATE` RLS policy, so a client-side bulk
  update would have silently affected zero rows rather than erroring — the
  same failure shape as the account-deletion bug fixed earlier. This adds a
  SECURITY DEFINER function that converts everything atomically in one
  transaction, scoped to the caller via auth.uid().

  ## New function
  - `convert_user_units(p_new_unit text)`
    - Looks up the caller's current unit_preference, no-ops if unchanged
    - Converts user_profiles: unit_preference, squat/bench/deadlift_max and
      their tested-max counterparts (rounded to the target unit's plate
      increment — 5 lb / 2.5 kg)
    - Converts workout_sessions: weight_lifted, calculated_1rm (rounded to
      0.1, matching how meet attempts are already stored)
    - Converts accessory_exercises.sets_data (a jsonb array of
      {reps, weight} objects, weight stored as a numeric string) for every
      session belonging to the caller, leaving non-numeric weight strings
      (blank sets, bodyweight-only entries) untouched
    - Does NOT touch bodyweight — that's edited directly on the same form
      and converted client-side as the user types, to avoid clobbering an
      in-progress edit
    - Does NOT touch available_plates_lb/available_plates_kg — those are
      already separate, unit-segregated columns by design
*/

CREATE OR REPLACE FUNCTION convert_user_units(p_new_unit text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_unit text;
  v_factor numeric;
  v_round_to numeric;
BEGIN
  IF p_new_unit NOT IN ('lb', 'kg') THEN
    RAISE EXCEPTION 'Unsupported unit: %', p_new_unit;
  END IF;

  SELECT COALESCE(unit_preference, 'lb') INTO v_old_unit
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_old_unit IS NULL OR v_old_unit = p_new_unit THEN
    RETURN;
  END IF;

  v_factor := CASE WHEN v_old_unit = 'kg' THEN 2.20462 ELSE 1 / 2.20462 END;
  v_round_to := CASE WHEN p_new_unit = 'kg' THEN 2.5 ELSE 5 END;

  UPDATE user_profiles
  SET
    unit_preference = p_new_unit,
    squat_max = CASE WHEN squat_max IS NOT NULL AND squat_max != 0
      THEN round((squat_max * v_factor) / v_round_to) * v_round_to ELSE squat_max END,
    bench_max = CASE WHEN bench_max IS NOT NULL AND bench_max != 0
      THEN round((bench_max * v_factor) / v_round_to) * v_round_to ELSE bench_max END,
    deadlift_max = CASE WHEN deadlift_max IS NOT NULL AND deadlift_max != 0
      THEN round((deadlift_max * v_factor) / v_round_to) * v_round_to ELSE deadlift_max END,
    squat_tested_max = CASE WHEN squat_tested_max IS NOT NULL AND squat_tested_max != 0
      THEN round((squat_tested_max * v_factor) / v_round_to) * v_round_to ELSE squat_tested_max END,
    bench_tested_max = CASE WHEN bench_tested_max IS NOT NULL AND bench_tested_max != 0
      THEN round((bench_tested_max * v_factor) / v_round_to) * v_round_to ELSE bench_tested_max END,
    deadlift_tested_max = CASE WHEN deadlift_tested_max IS NOT NULL AND deadlift_tested_max != 0
      THEN round((deadlift_tested_max * v_factor) / v_round_to) * v_round_to ELSE deadlift_tested_max END,
    updated_at = now()
  WHERE id = auth.uid();

  UPDATE workout_sessions
  SET
    weight_lifted = round((weight_lifted * v_factor)::numeric, 1),
    calculated_1rm = round((calculated_1rm * v_factor)::numeric, 1)
  WHERE user_id = auth.uid();

  UPDATE accessory_exercises ae
  SET sets_data = (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN (elem->>'weight') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN jsonb_set(elem, '{weight}', to_jsonb(round((elem->>'weight')::numeric * v_factor, 1)::text))
        ELSE elem
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(ae.sets_data) AS elem
  )
  FROM workout_sessions ws
  WHERE ae.workout_session_id = ws.id
    AND ws.user_id = auth.uid();
END;
$$;
