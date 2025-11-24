import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  squat_max: number;
  bench_max: number;
  deadlift_max: number;
  ohp_max: number;
  current_cycle: number;
  current_week: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  lift_type: 'squat' | 'bench' | 'deadlift' | 'ohp';
  cycle: number;
  week: number;
  weight_lifted: number;
  reps_performed: number;
  calculated_1rm: number;
  completed_at: string;
  created_at: string;
  is_1rm_test?: boolean;
  notes?: string;
}

export interface ExerciseSubstitution {
  id: string;
  original_exercise: string;
  substitute_exercise: string;
  description: string;
  equipment_needed: string;
  difficulty: 'easier' | 'similar' | 'harder';
  muscle_groups: string[];
  created_at: string;
}
