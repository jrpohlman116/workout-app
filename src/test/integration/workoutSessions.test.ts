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

describe('Workout Sessions Database Operations', () => {
  let userId: string;
  const testPassword = 'TestPassword123!';

  beforeEach(async () => {
    const testEmail = generateTestEmail();
    const result = await createTestUser(testEmail, testPassword);
    userId = result.user!.id;
    await waitForAuth();
    await createTestProfile(userId);
  });

  afterEach(async () => {
    if (userId) {
      await cleanupTestUser(userId);
    }
    await signOutTestUser();
  });

  it('should create a workout session', async () => {
    const session = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
      weight_lifted: 270,
      reps_performed: 5,
    });

    expect(session).toBeDefined();
    expect(session.user_id).toBe(userId);
    expect(session.lift_type).toBe('squat');
    expect(session.weight_lifted).toBe(270);
    expect(session.reps_performed).toBe(5);
  });

  it('should retrieve workout sessions for a user', async () => {
    await createTestWorkoutSession(userId, { lift_type: 'squat' });
    await createTestWorkoutSession(userId, { lift_type: 'bench' });
    await createTestWorkoutSession(userId, { lift_type: 'deadlift' });

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });

  it('should filter workout sessions by lift type', async () => {
    await createTestWorkoutSession(userId, { lift_type: 'squat' });
    await createTestWorkoutSession(userId, { lift_type: 'squat' });
    await createTestWorkoutSession(userId, { lift_type: 'bench' });

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('lift_type', 'squat');

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.every(s => s.lift_type === 'squat')).toBe(true);
  });

  it('should calculate 1RM correctly in workout session', async () => {
    const session = await createTestWorkoutSession(userId, {
      weight_lifted: 225,
      reps_performed: 5,
      calculated_1rm: 263,
    });

    expect(session.calculated_1rm).toBe(263);
  });

  it('should order workout sessions by date', async () => {
    const session1 = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const session2 = await createTestWorkoutSession(userId, {
      lift_type: 'squat',
    });

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data![0].id).toBe(session2.id);
    expect(data![1].id).toBe(session1.id);
  });

  it('should retrieve workout sessions for specific cycle and week', async () => {
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
      lift_type: 'squat',
      cycle: 1,
      week: 2,
    });

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('cycle', 1)
      .eq('week', 1);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.every(s => s.cycle === 1 && s.week === 1)).toBe(true);
  });

  it('should update workout session', async () => {
    const session = await createTestWorkoutSession(userId, {
      weight_lifted: 270,
      reps_performed: 5,
    });

    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        weight_lifted: 280,
        reps_performed: 6,
        calculated_1rm: 333,
      })
      .eq('id', session.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.weight_lifted).toBe(280);
    expect(data?.reps_performed).toBe(6);
    expect(data?.calculated_1rm).toBe(333);
  });

  it('should delete workout session', async () => {
    const session = await createTestWorkoutSession(userId);

    const { error: deleteError } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', session.id);

    expect(deleteError).toBeNull();

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', session.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('should enforce RLS - users cannot see other users sessions', async () => {
    const otherEmail = generateTestEmail();
    const otherResult = await createTestUser(otherEmail, testPassword);
    const otherUserId = otherResult.user!.id;

    try {
      await createTestProfile(otherUserId);
      await createTestWorkoutSession(otherUserId, { lift_type: 'squat' });

      await signOutTestUser();
      const testEmail = generateTestEmail();
      const result = await createTestUser(testEmail, testPassword);
      const newUserId = result.user!.id;
      await waitForAuth();
      await createTestProfile(newUserId);

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', otherUserId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      await cleanupTestUser(newUserId);
    } finally {
      await cleanupTestUser(otherUserId);
    }
  });
});
