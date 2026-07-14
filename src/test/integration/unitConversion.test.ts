import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  createTestUser,
  signOutTestUser,
  cleanupTestUser,
  createTestProfile,
  createTestWorkoutSession,
  generateTestEmail,
  waitForAuth,
} from './testHelpers';

// Mirrors the SQL function's own math so the test verifies the *formula*,
// not just "some number came back".
const LB_PER_KG = 2.20462;
function expectedConverted(value: number, fromUnit: 'lb' | 'kg', roundTo: number) {
  const factor = fromUnit === 'kg' ? LB_PER_KG : 1 / LB_PER_KG;
  return Math.round((value * factor) / roundTo) * roundTo;
}

describe('convert_user_units RPC', () => {
  let userId: string;
  const testPassword = 'TestPassword123!';

  beforeEach(async () => {
    const testEmail = generateTestEmail();
    const result = await createTestUser(testEmail, testPassword);
    userId = result.user!.id;
    await waitForAuth();
  });

  afterEach(async () => {
    if (userId) {
      await cleanupTestUser(userId);
    }
    await signOutTestUser();
  });

  it('converts training/tested maxes from lb to kg, rounded to 2.5 kg', async () => {
    await createTestProfile(userId, {
      unit_preference: 'lb',
      squat_max: 315,
      bench_max: 225,
      deadlift_max: 405,
      squat_tested_max: 345,
    });

    const { error } = await supabase.rpc('convert_user_units', { p_new_unit: 'kg' });
    expect(error).toBeNull();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    expect(profile.unit_preference).toBe('kg');
    expect(profile.squat_max).toBe(expectedConverted(315, 'lb', 2.5));
    expect(profile.bench_max).toBe(expectedConverted(225, 'lb', 2.5));
    expect(profile.deadlift_max).toBe(expectedConverted(405, 'lb', 2.5));
    expect(profile.squat_tested_max).toBe(expectedConverted(345, 'lb', 2.5));
  });

  it('converts workout_sessions weight_lifted and calculated_1rm', async () => {
    await createTestProfile(userId, { unit_preference: 'lb' });
    const session = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      weight_lifted: 225,
      calculated_1rm: 250,
    });

    const { error } = await supabase.rpc('convert_user_units', { p_new_unit: 'kg' });
    expect(error).toBeNull();

    const { data: updated } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    const factor = 1 / LB_PER_KG;
    expect(updated.weight_lifted).toBeCloseTo(Math.round(225 * factor * 10) / 10, 5);
    expect(updated.calculated_1rm).toBeCloseTo(Math.round(250 * factor * 10) / 10, 5);
  });

  it('converts numeric accessory set weights but leaves non-numeric entries untouched', async () => {
    await createTestProfile(userId, { unit_preference: 'lb' });
    const session = await createTestWorkoutSession(userId, { lift_type: 'squat' });

    await supabase.from('accessory_exercises').insert({
      workout_session_id: session.id,
      exercise_name: 'Leg Press',
      exercise_order: 1,
      sets_data: [
        { reps: '10', weight: '300' },
        { reps: '8', weight: '' },
      ],
    });

    const { error } = await supabase.rpc('convert_user_units', { p_new_unit: 'kg' });
    expect(error).toBeNull();

    const { data: accessory } = await supabase
      .from('accessory_exercises')
      .select('*')
      .eq('workout_session_id', session.id)
      .single();

    const factor = 1 / LB_PER_KG;
    const expectedWeight = (Math.round(300 * factor * 10) / 10).toString();
    expect(accessory.sets_data[0].weight).toBe(expectedWeight);
    expect(accessory.sets_data[0].reps).toBe('10');
    expect(accessory.sets_data[1].weight).toBe('');
    expect(accessory.sets_data[1].reps).toBe('8');
  });

  it('is a no-op when the target unit matches the current unit', async () => {
    await createTestProfile(userId, { unit_preference: 'lb', squat_max: 315 });

    const { error } = await supabase.rpc('convert_user_units', { p_new_unit: 'lb' });
    expect(error).toBeNull();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('squat_max, unit_preference')
      .eq('id', userId)
      .single();

    expect(profile?.squat_max).toBe(315);
    expect(profile?.unit_preference).toBe('lb');
  });
});
