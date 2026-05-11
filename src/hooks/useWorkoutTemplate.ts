import { useState, useEffect } from 'react';
import { supabase, WorkoutTemplate } from '../lib/supabase';
import { Exercise } from '../pages/WorkoutDetail/types';
import { StickingPoint, selectMixedAccessories } from '../pages/WorkoutDetail/weakPointExercises';

interface UseWorkoutTemplateResult {
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveTemplate: (exercises: Exercise[]) => Promise<boolean>;
  resetToDefault: (defaultExercises: Exercise[]) => Promise<boolean>;
}

export function useWorkoutTemplate(
  userId: string | undefined,
  liftType: 'squat' | 'bench' | 'deadlift' | 'ohp' | 'upper',
  programVariation: 'standard' | 'bbb' | 'bbs',
  defaultExercises: Exercise[],
  weakPoints?: StickingPoint[]
): UseWorkoutTemplateResult {
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>(defaultExercises);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadTemplate();
    } else {
      setExercises(defaultExercises);
      setLoading(false);
    }
  }, [userId, liftType, programVariation, weakPoints]);

  const loadTemplate = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('lift_type', liftType)
        .eq('program_variation', programVariation)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setTemplate(data);
        setExercises(data.exercises_data as Exercise[]);
      } else {
        setTemplate(null);
        // If weak points are defined, generate weak-point-based exercises
        if (weakPoints && weakPoints.length > 0) {
          const selectedNames = selectMixedAccessories(liftType, weakPoints);
          // Map exercise names to default exercises or create placeholders
          const selectedExercises = selectedNames
            .map(name => {
              const found = defaultExercises.find(e => e.name === name);
              return found || { name, reps: '8-12', sets: 3, isBodyweight: false };
            })
            .slice(0, 4);
          setExercises(selectedExercises);
        } else {
          setExercises(defaultExercises);
        }
      }
    } catch (err) {
      console.error('Error loading workout template:', err);
      setError('Failed to load workout template');
      setExercises(defaultExercises);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (newExercises: Exercise[]): Promise<boolean> => {
    if (!userId) return false;

    if (newExercises.length === 0 || newExercises.length > 7) {
      setError('Please select between 1 and 7 exercises');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const templateData = {
        user_id: userId,
        lift_type: liftType,
        program_variation: programVariation,
        exercises_data: newExercises,
        updated_at: new Date().toISOString(),
      };

      if (template) {
        const { error: updateError } = await supabase
          .from('workout_templates')
          .update(templateData)
          .eq('id', template.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('workout_templates')
          .insert([templateData]);

        if (insertError) throw insertError;
      }

      await loadTemplate();
      return true;
    } catch (err) {
      console.error('Error saving workout template:', err);
      setError('Failed to save workout template');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async (defaultExercises: Exercise[]): Promise<boolean> => {
    if (!userId) return false;

    if (!template) {
      setExercises(defaultExercises);
      return true;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', template.id);

      if (deleteError) throw deleteError;

      setTemplate(null);
      setExercises(defaultExercises);
      return true;
    } catch (err) {
      console.error('Error resetting workout template:', err);
      setError('Failed to reset workout template');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    template,
    exercises,
    loading,
    saving,
    error,
    saveTemplate,
    resetToDefault,
  };
}
