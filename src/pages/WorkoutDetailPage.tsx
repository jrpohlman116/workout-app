import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculateWorkoutWeights, calculateOneRepMax } from '../lib/calculations';
import { supabase } from '../lib/supabase';
import { useConfetti } from '../hooks/useAnimations';

interface WorkoutDetailPageProps {
  liftType: string;
  onBack: () => void;
}

export default function WorkoutDetailPage({ liftType, onBack }: WorkoutDetailPageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);
  const celebrate = useConfetti();

  if (!profile) return null;

  const liftNames: Record<string, string> = {
    squat: 'Squat',
    bench: 'Bench Press',
    deadlift: 'Deadlift',
    ohp: 'Overhead Press',
  };

  const maxes: Record<string, number> = {
    squat: profile.squat_max,
    bench: profile.bench_max,
    deadlift: profile.deadlift_max,
    ohp: profile.ohp_max,
  };

  const weights = calculateWorkoutWeights(
    liftType,
    maxes[liftType],
    profile.current_cycle,
    profile.current_week
  );

  const exercises = {
    squat: [
      { name: 'Romanian Deadlift', reps: '8-12' },
      { name: 'Bulgarian Split Squats', reps: '8-10' },
      { name: 'Leg Curls', reps: '12-15' },
      { name: 'Plank', reps: '30-60 sec' },
    ],
    bench: [
      { name: 'Incline DB Press', reps: '8-12' },
      { name: 'Barbell Curls', reps: '8-12' },
      { name: 'Tricep Pressdowns', reps: '8-12' },
      { name: 'Face Pulls', reps: '15-20' },
    ],
    deadlift: [
      { name: 'Leg Press', reps: '5-8' },
      { name: 'B Stance RDLs', reps: '8-12' },
      { name: 'Barbell Rows', reps: '8-12' },
      { name: 'Abs', reps: '10-15 min' },
    ],
    ohp: [
      { name: 'Close-Grip Bench', reps: '8-12' },
      { name: 'Lat Pull-Overs', reps: '8-12' },
      { name: 'Lateral Raise Complex', reps: '12-15' },
      { name: 'Rear Delt Flyes', reps: '10-15' },
    ],
  };

  const mainReps = profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5;

  const handleComplete = async () => {
    if (!weight || !reps || !user) return;

    setSaving(true);
    try {
      const calculated1RM = calculateOneRepMax(parseFloat(weight), parseInt(reps));

      await supabase.from('workout_sessions').insert({
        user_id: user.id,
        lift_type: liftType,
        cycle: profile.current_cycle,
        week: profile.current_week,
        weight_lifted: parseFloat(weight),
        reps_performed: parseInt(reps),
        calculated_1rm: calculated1RM,
      });

      celebrate(40);
      setTimeout(async () => {
        await refreshProfile();
        onBack();
      }, 800);
    } catch (error) {
      console.error('Error saving workout:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">{liftNames[liftType]}</h1>
          <p className="text-gray-600">Week {profile.current_week} - Cycle {profile.current_cycle}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Main Sets</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="font-medium text-gray-700">Set 1</span>
              <span className="font-bold text-gray-900">{weights.set1} lb × {mainReps}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <span className="font-medium text-gray-700">Set 2</span>
              <span className="font-bold text-gray-900">{weights.set2} lb × {mainReps}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border-2 border-blue-600">
              <div>
                <span className="font-medium text-gray-700">Set 3 - AMRAP</span>
                <p className="text-xs text-gray-600 mt-0.5">As Many Reps As Possible</p>
              </div>
              <span className="font-bold text-gray-900">{weights.set3} lb × {mainReps}+</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Push yourself on this final set!</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Your Final Set</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Weight on Your AMRAP Set
              </label>
              <p className="text-xs text-gray-500 mb-2">This should match Set 3 weight above ({weights.set3} lb)</p>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={`${weights.set3}`}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                How many reps did you complete?
              </label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="e.g., 8, 10, 12..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">Couldn't complete the set? That's okay - log what you did!</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accessory Exercises</h2>
          <div className="space-y-2">
            {exercises[liftType as keyof typeof exercises].map((exercise, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-700">{exercise.name}</span>
                <span className="text-sm text-gray-600">{exercise.reps}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleComplete}
          disabled={!weight || !reps || saving}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Recording your lift...' : 'Save & Mark Complete'}
        </button>
      </div>
    </div>
  );
}
