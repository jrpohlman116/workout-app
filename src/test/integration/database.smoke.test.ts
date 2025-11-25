import { describe, it, expect } from 'vitest';
import { supabase } from '../../lib/supabase';

describe('Database Connection Smoke Tests', () => {
  it('should connect to Supabase', async () => {
    const { data, error } = await supabase.from('user_profiles').select('count');

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have workout_sessions table', async () => {
    const { error } = await supabase.from('workout_sessions').select('count').limit(0);

    expect(error).toBeNull();
  });

  it('should have accessory_exercises table', async () => {
    const { error } = await supabase.from('accessory_exercises').select('count').limit(0);

    expect(error).toBeNull();
  });

  it('should have exercise_substitutions table', async () => {
    const { error } = await supabase.from('exercise_substitutions').select('count').limit(0);

    expect(error).toBeNull();
  });
});
