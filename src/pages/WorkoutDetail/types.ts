export interface WorkoutDetailPageProps {
  liftType: string;
  onBack: () => void;
  onNavigateToProgress: () => void;
}

export type WorkoutStep = 'summary' | 'main' | 'supplemental' | number;

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
