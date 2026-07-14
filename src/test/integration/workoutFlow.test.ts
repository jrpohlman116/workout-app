import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { calculateOneRepMax, calculateJuggernautSets, calculateNewTrainingMax } from '../../lib/calculations';
import {
  createTestUser,
  signOutTestUser,
  cleanupTestUser,
  createTestProfile,
  createTestWorkoutSession,
  generateTestEmail,
  waitForAuth,
} from './testHelpers';

describe('E2E Workout Flow Tests', () => {
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

  it('should complete onboarding flow', async () => {
    const profile = await createTestProfile(userId, {
      bodyweight: 180,
      gender: 'male',
      squat_max: 315,
      bench_max: 225,
      deadlift_max: 405,
      ohp_max: 135,
      onboarding_completed: true,
      current_cycle: 1,
      current_week: 1,
    });

    expect(profile.onboarding_completed).toBe(true);
    expect(profile.current_cycle).toBe(1);
    expect(profile.current_week).toBe(1);

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle', 0)
      .eq('week', 0);

    expect(sessions).toBeDefined();
  });

  it('should complete a full workout session', async () => {
    await createTestProfile(userId, {
      squat_max: 315,
      current_cycle: 1,
      current_week: 1,
    });

    const weights = calculateJuggernautSets(10, 'accumulation', 315);

    const session = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 1,
      weight_lifted: weights.weight,
      reps_performed: 5,
      calculated_1rm: calculateOneRepMax(weights.weight, 5),
    });

    expect(session).toBeDefined();
    expect(session.lift_type).toBe('squat');
    expect(session.cycle).toBe(1);
    expect(session.week).toBe(1);
    expect(session.calculated_1rm).toBeGreaterThan(0);
  });

  it('should track progress across multiple weeks', async () => {
    await createTestProfile(userId, {
      squat_max: 315,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 1,
      weight_lifted: 230,
      reps_performed: 5,
      calculated_1rm: 268,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 2,
      weight_lifted: 245,
      reps_performed: 3,
      calculated_1rm: 270,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 3,
      weight_lifted: 255,
      reps_performed: 5,
      calculated_1rm: 297,
    });

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('lift_type', 'squat')
      .order('week', { ascending: true });

    expect(sessions).toHaveLength(3);
    expect(sessions![0].week).toBe(1);
    expect(sessions![1].week).toBe(2);
    expect(sessions![2].week).toBe(3);
  });

  it('should progress to next cycle after completing 4 weeks', async () => {
    await createTestProfile(userId, {
      squat_max: 315,
      current_cycle: 1,
      current_week: 4,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 4,
    });

    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .update({
        current_cycle: 2,
        current_week: 1,
      })
      .eq('id', userId)
      .select()
      .single();

    expect(updatedProfile?.current_cycle).toBe(2);
    expect(updatedProfile?.current_week).toBe(1);
  });

  it('should track all four main lifts', async () => {
    await createTestProfile(userId, {
      squat_max: 315,
      bench_max: 225,
      deadlift_max: 405,
      ohp_max: 135,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 1,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'bench',
      cycle: 1,
      week: 1,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'deadlift',
      cycle: 1,
      week: 1,
    });

    await createTestWorkoutSession(userId, {
      lift_type: 'ohp',
      cycle: 1,
      week: 1,
    });

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle', 1)
      .eq('week', 1);

    expect(sessions).toHaveLength(4);
    const liftTypes = sessions!.map(s => s.lift_type).sort();
    expect(liftTypes).toEqual(['bench', 'deadlift', 'ohp', 'squat']);
  });

  it('should update training max after successful cycle', async () => {
    const currentTrainingMax = 315;
    const standardReps = 5; // realization AMAP target for the 5-rep wave

    await createTestProfile(userId, {
      squat_max: currentTrainingMax,
    });

    const weightLifted = 255;
    const repsPerformed = 8;

    await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 3,
      weight_lifted: weightLifted,
      reps_performed: repsPerformed,
      calculated_1rm: calculateOneRepMax(weightLifted, repsPerformed),
    });

    const newTrainingMax = calculateNewTrainingMax(currentTrainingMax, standardReps, repsPerformed, 'lb');

    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .update({ squat_max: newTrainingMax })
      .eq('id', userId)
      .select()
      .single();

    expect(updatedProfile?.squat_max).toBe(newTrainingMax);
  });

  it('should handle deload week correctly', async () => {
    await createTestProfile(userId, {
      squat_max: 315,
    });

    const weights = calculateJuggernautSets(10, 'deload', 315);

    const session = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      cycle: 1,
      week: 4,
      weight_lifted: weights.weight,
      reps_performed: 5,
    });

    expect(session.week).toBe(4);
    expect(session.weight_lifted).toBeLessThan(
      calculateJuggernautSets(10, 'realization', 315).weight
    );
  });

  it('should store accessory exercises for a workout', async () => {
    await createTestProfile(userId);

    const session = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
    });

    const { data: accessory, error } = await supabase
      .from('accessory_exercises')
      .insert({
        workout_session_id: session.id,
        exercise_name: 'Leg Press',
        exercise_order: 1,
        sets_data: [
          { reps: '10', weight: '300' },
          { reps: '10', weight: '300' },
          { reps: '10', weight: '300' },
        ],
      })
      .select()
      .maybeSingle();

    expect(error).toBeNull();
    expect(accessory?.exercise_name).toBe('Leg Press');
    expect(accessory?.sets_data).toHaveLength(3);
  });

  it('should retrieve workout history with accessory exercises', async () => {
    await createTestProfile(userId);

    const session = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
    });

    await supabase.from('accessory_exercises').insert({
      workout_session_id: session.id,
      exercise_name: 'Leg Press',
      exercise_order: 1,
      sets_data: [{ reps: '10', weight: '300' }],
    });

    const { data } = await supabase
      .from('workout_sessions')
      .select('*, accessory_exercises(*)')
      .eq('id', session.id)
      .single();

    expect(data).toBeDefined();
    expect(data?.accessory_exercises).toBeDefined();
  });
});
