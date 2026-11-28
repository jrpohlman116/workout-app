import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProgramContext } from './useProgramContext';
import { useWorkoutTemplate } from './useWorkoutTemplate';
import { applyPhaseToAccessories, baseExercises, getWeakPointSources } from '../lib/exercises';
import type { StickingPoint } from '../lib/supabase';

/**
 * A day's accessories, resolved the same way as the workout page: the saved
 * template, else weak-point picks (which come first, so the first accessory
 * is the priority one), else the day's defaults, adjusted for the phase.
 */
export function useDayAccessories(lift: string) {
  const { user, profile } = useAuth();
  const programCtx = useProgramContext();
  const liftKey = lift as 'squat' | 'bench' | 'deadlift' | 'ohp' | 'upper';
  const defaults = baseExercises[liftKey as keyof typeof baseExercises] ?? baseExercises.upper;
  const splitStyle = profile?.split_style ?? undefined;
  const daySlots = programCtx?.layout.days.find(d => d.dayId === lift)?.variationSlots;
  const [primarySource] = getWeakPointSources(liftKey, splitStyle, daySlots);
  const weakPoints = primarySource
    ? (profile?.weak_points?.[primarySource.profileLift] as StickingPoint[] | undefined)
    : undefined;

  const { exercises, loading } = useWorkoutTemplate(
    user?.id, liftKey, 'standard', defaults, weakPoints, splitStyle, profile?.weak_points, daySlots,
  );
  const phase = programCtx?.currentBlock?.phase;
  const phased = useMemo(() => applyPhaseToAccessories(exercises, phase, lift), [exercises, phase, lift]);
  return { accessories: phased.exercises, note: phased.note, loading };
}
