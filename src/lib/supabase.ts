import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Juggernaut weak point zones — set per lift during onboarding, editable in profile
export type StickingPoint = 'in_the_hole' | 'mid_range' | 'lockout';

export interface WeakPoints {
  squat: StickingPoint[];
  bench: StickingPoint[];
  deadlift: StickingPoint[];
}

export interface UserProfile {
  id: string;
  squat_max: number;
  bench_max: number;
  deadlift_max: number;
  /** @deprecated OHP is no longer a main lift. Kept until profile UI is updated. */
  ohp_max: number;
  current_cycle: number;
  current_week: number;
  onboarding_completed: boolean;
  bodyweight?: number;
  gender?: string;
  unit_preference?: string;
  /** @deprecated Replaced by weak_points system. Kept until profile UI is updated. */
  program_variation?: 'standard' | 'bbb' | 'bbs';
  available_plates_lb?: number[];
  available_plates_kg?: number[];
  // Juggernaut fields
  meet_date?: string;           // ISO date (YYYY-MM-DD) — drives wave schedule
  program_start_date?: string;  // ISO date — combined with meet_date to reconstruct schedule
  weak_points?: WeakPoints;     // sticking points per lift
  created_at: string;
  updated_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  lift_type: 'squat' | 'bench' | 'deadlift' | 'ohp' | 'upper';
  cycle: number;
  week: number;
  weight_lifted: number;
  reps_performed: number;
  calculated_1rm: number;
  completed_at: string;
  created_at: string;
  is_1rm_test?: boolean;
  notes?: string;
  // Juggernaut fields
  wave?: 10 | 8 | 5 | 3;
  phase?: 'accumulation' | 'intensification' | 'realization' | 'deload';
  rpe?: number;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  lift_type: 'squat' | 'bench' | 'deadlift' | 'ohp';
  program_variation: 'standard' | 'bbb' | 'bbs';
  exercises_data: {
    name: string;
    reps: string;
    sets: number;
    isBodyweight: boolean;
  }[];
  created_at: string;
  updated_at: string;
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

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  lift_type: 'squat' | 'bench' | 'deadlift' | 'ohp';
  program_variation: 'standard' | 'bbb' | 'bbs';
  exercises_data: {
    name: string;
    reps: string;
    sets: number;
    isBodyweight: boolean;
  }[];
  created_at: string;
  updated_at: string;
}
