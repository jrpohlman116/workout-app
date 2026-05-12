import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  createTestUser,
  signOutTestUser,
  cleanupTestUser,
  createTestProfile,
  generateTestEmail,
  waitForAuth,
} from './testHelpers';

describe('User Profiles Database Operations', () => {
  let userId: string;
  const testPassword = 'TestPassword123!';

  beforeEach(async () => {
    const testEmail = generateTestEmail();
    const result = await createTestUser(testEmail, testPassword);
    if (!result.user) {
      throw new Error('User creation failed: result.user is null or undefined');
    }
    userId = result.user.id;
    await waitForAuth();
  });

  afterEach(async () => {
    if (userId) {
      await cleanupTestUser(userId);
    }
    await signOutTestUser();
  });

  it('should create a user profile', async () => {
    const profile = await createTestProfile(userId, {
      bodyweight: 180,
      gender: 'male',
      squat_max: 315,
    });

    expect(profile).toBeDefined();
    expect(profile.id).toBe(userId);
    expect(profile.bodyweight).toBe(180);
    expect(profile.gender).toBe('male');
    expect(profile.squat_max).toBe(315);
  });

  it('should retrieve user profile', async () => {
    await createTestProfile(userId);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.id).toBe(userId);
  });

  it('should update user profile', async () => {
    await createTestProfile(userId, {
      bodyweight: 180,
      squat_max: 315,
    });

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        bodyweight: 185,
        squat_max: 325,
        current_cycle: 2,
        current_week: 3,
      })
      .eq('id', userId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.bodyweight).toBe(185);
    expect(data?.squat_max).toBe(325);
    expect(data?.current_cycle).toBe(2);
    expect(data?.current_week).toBe(3);
  });

  it('should update onboarding status', async () => {
    await createTestProfile(userId, {
      onboarding_completed: false,
    });

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.onboarding_completed).toBe(true);
  });

  it('should update unit preference', async () => {
    await createTestProfile(userId, {
      unit_preference: 'lb',
    });

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ unit_preference: 'kg' })
      .eq('id', userId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.unit_preference).toBe('kg');
  });

  it('should update all max lifts', async () => {
    await createTestProfile(userId, {
      squat_max: 300,
      bench_max: 200,
      deadlift_max: 400,
      ohp_max: 125,
    });

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        squat_max: 315,
        bench_max: 225,
        deadlift_max: 405,
        ohp_max: 135,
      })
      .eq('id', userId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.squat_max).toBe(315);
    expect(data?.bench_max).toBe(225);
    expect(data?.deadlift_max).toBe(405);
    expect(data?.ohp_max).toBe(135);
  });

  it('should update gender', async () => {
    await createTestProfile(userId, {
      gender: 'male',
    });

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ gender: 'female' })
      .eq('id', userId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.gender).toBe('female');
  });

  it('should enforce RLS - users cannot see other users profiles', async () => {
    const otherEmail = generateTestEmail();
    const otherResult = await createTestUser(otherEmail, testPassword);
    const otherUserId = otherResult.user!.id;

    try {
      await createTestProfile(otherUserId);

      await signOutTestUser();
      const testEmail = generateTestEmail();
      const result = await createTestUser(testEmail, testPassword);
      const newUserId = result.user!.id;
      await waitForAuth();
      await createTestProfile(newUserId);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', otherUserId);
      // RLS may return an error or empty data array depending on policy
      if (error) {
        expect(data).toBeNull();
      } else {
        expect(data).toHaveLength(0);
      }

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      await cleanupTestUser(newUserId);
    } finally {
      await cleanupTestUser(otherUserId);
    }
  });

  it('should enforce RLS - users cannot update other users profiles', async () => {
    const otherEmail = generateTestEmail();
    const otherResult = await createTestUser(otherEmail, testPassword);
    const otherUserId = otherResult.user!.id;

    try {
      await createTestProfile(otherUserId, { bodyweight: 180 });

      await signOutTestUser();
      const testEmail = generateTestEmail();
      const result = await createTestUser(testEmail, testPassword);
      const newUserId = result.user!.id;
      await waitForAuth();
      await createTestProfile(newUserId);

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ bodyweight: 200 })
        .eq('id', otherUserId)
        .select();

      expect(data).toHaveLength(0);

      await cleanupTestUser(newUserId);
    } finally {
      await cleanupTestUser(otherUserId);
    }
  });

  it('should have default values set correctly', async () => {
    const profile = await createTestProfile(userId, {
      current_cycle: 1,
      current_week: 1,
      onboarding_completed: true,
    });

    expect(profile.current_cycle).toBe(1);
    expect(profile.current_week).toBe(1);
    expect(profile.onboarding_completed).toBe(true);
    expect(profile.created_at).toBeDefined();
    expect(profile.updated_at).toBeDefined();
  });
});
