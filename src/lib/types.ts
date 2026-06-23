import type { WorkoutSession } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RepWave = 10 | 8 | 5 | 3;
export type WavePhase = 'accumulation' | 'intensification' | 'realization' | 'deload' | 'peaking' | 'meet_week';
export type WarmupFeel = 'easy' | 'good' | 'bad';
export type WorkoutStep = 'summary' | 'main' | number;
export type ProgressTab = 'overview' | 'records' | 'log' | 'meets';
export type ProfileTab = 'body' | 'maxes' | 'training' | 'security';
export type CalculatorTab = '1rm' | 'wilks' | 'plates';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WeekBlock {
  wave: RepWave;
  phase: WavePhase;
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  peakWeek?: number;
  totalPeakWeeks?: number;
}

export interface WaveSchedule {
  weeks: WeekBlock[];
  skippedWaves: RepWave[];
  adjustments: string[];
  totalWeeks: number;
  peakWeekIndex: number;
}

export interface BackoffSet {
  weight: number;
  sets: number;
  reps: number;
}

export interface WarmupSet {
  weight: number;
  reps: number;
  percentage?: number;
}

export interface WarmupProgression {
  fixedSets: WarmupSet[];
  getApproachWeight: (set4Feel: WarmupFeel) => number;
  getAdjustedWorkingWeight: (set4Feel: WarmupFeel, set5Feel: WarmupFeel) => number;
  approachWeights: { smooth: number; tough: number };
}

export interface JuggernautSetsConfig {
  numSets: number;
  reps: number;
  weight: number;
  isAmap: boolean;
}

export interface WorkoutDetailPageProps {
  liftType: string;
  onBack: () => void;
  onNavigateToProgress: () => void;
  skipSummary?: boolean;
}

export interface SetInput {
  reps: string;
  weight: string;
}

export interface Exercise {
  name: string;
  reps: string;
  sets: number;
  isBodyweight: boolean;
}

export interface LastWorkoutData {
  weight: number;
  reps: number;
}

export interface WorkoutStats {
  estimated1RM: number;
  totalTonnage: number;
}

export interface CurrentBlock {
  wave: RepWave;
  phase: WavePhase;
  weekIndex: number;
}

export interface AccessoryExercise {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets_data: { reps: string; weight: string }[];
  workout_session_id: string;
}

export interface MeetGroup {
  date: string;
  attemptsByLift: Record<string, WorkoutSession[]>;
  bestSquat: WorkoutSession | null;
  bestBench: WorkoutSession | null;
  bestDeadlift: WorkoutSession | null;
  total: number | null;
}
