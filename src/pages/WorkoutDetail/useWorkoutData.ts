import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SetInput } from './types';

export function useWorkoutData(userId: string | undefined, liftType: string) {
  const [lastMainLift, setLastMainLift] = useState<{ weight: number; reps: number } | null>(null);
  const [lastAccessoryData, setLastAccessoryData] = useState<{ [key: string]: SetInput[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadLastWorkoutData();
    }
  }, [userId, liftType]);

  const loadLastWorkoutData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('lift_type', liftType)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setLastMainLift({
          weight: sessionData.weight_lifted,
          reps: sessionData.reps_performed,
        });

        const { data: accessoryData } = await supabase
          .from('accessory_exercises')
          .select('*')
          .eq('workout_session_id', sessionData.id)
          .order('exercise_order', { ascending: true });

        if (accessoryData) {
          const formattedData: { [key: string]: SetInput[] } = {};
          accessoryData.forEach(exercise => {
            formattedData[exercise.exercise_name] = exercise.sets_data as SetInput[];
          });
          setLastAccessoryData(formattedData);
        }
      }
    } catch (error) {
      console.error('Error loading last workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLastSetData = (exerciseName: string) => {
    if (exerciseName === 'main') {
      if (loading) return 'Loading...';
      if (!lastMainLift) return 'No previous data';
      return `${lastMainLift.weight}lb for ${lastMainLift.reps} reps`;
    }

    if (loading) return 'Loading...';
    const lastData = lastAccessoryData[exerciseName];
    if (!lastData || lastData.length === 0) return 'No previous data';

    const firstSet = lastData[0];
    return `${firstSet.weight || '0'}lb × ${firstSet.reps || '0'} reps (${lastData.length} sets)`;
  };

  return { lastMainLift, lastAccessoryData, loading, getLastSetData };
}
