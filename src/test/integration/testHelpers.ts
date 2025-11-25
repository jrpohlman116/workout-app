import { supabase } from '../../lib/supabase';

export async function createTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInTestUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutTestUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function cleanupTestUser(userId: string) {
  await supabase.from('workout_sessions').delete().eq('user_id', userId);
  await supabase.from('accessory_exercises').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);
}

export async function createTestProfile(userId: string, overrides = {}) {
  const defaultProfile = {
    id: userId,
    bodyweight: 180,
    gender: 'male',
    unit_preference: 'lb',
    squat_max: 315,
    bench_max: 225,
    deadlift_max: 405,
    ohp_max: 135,
    current_cycle: 1,
    current_week: 1,
    onboarding_completed: true,
    ...overrides,
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(defaultProfile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTestWorkoutSession(userId: string, overrides = {}) {
  const defaultSession = {
    user_id: userId,
    lift_type: 'squat',
    cycle: 1,
    week: 1,
    weight_lifted: 270,
    reps_performed: 5,
    calculated_1rm: 315,
    ...overrides,
  };

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert(defaultSession)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function generateTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForAuth(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Auth session not established');
}
