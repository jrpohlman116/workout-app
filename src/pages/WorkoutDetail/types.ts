import { WavePhase, RepWave } from '../../lib/calculations';

export interface WorkoutDetailPageProps {
  liftType: string;
  onBack: () => void;
  onNavigateToProgress: () => void;
}

export type WorkoutStep = 'summary' | 'main' | number;

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
