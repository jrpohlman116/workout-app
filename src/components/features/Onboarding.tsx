import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AccessibleNativeSelect from '../accessible/AccessibleNativeSelect';

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [bodyweight, setBodyweight] = useState('');
  const [gender, setGender] = useState('male');
  const [squatMax, setSquatMax] = useState('');
  const [benchMax, setBenchMax] = useState('');
  const [deadliftMax, setDeadliftMax] = useState('');
  const [ohpMax, setOhpMax] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .update({
          bodyweight: parseFloat(bodyweight) || 0,
          gender: gender,
          squat_max: parseFloat(squatMax) || 0,
          bench_max: parseFloat(benchMax) || 0,
          deadlift_max: parseFloat(deadliftMax) || 0,
          ohp_max: parseFloat(ohpMax) || 0,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) throw profileError;

      const initialMaxes = [
        { lift_type: 'squat', max: parseFloat(squatMax) || 0 },
        { lift_type: 'bench', max: parseFloat(benchMax) || 0 },
        { lift_type: 'deadlift', max: parseFloat(deadliftMax) || 0 },
        { lift_type: 'ohp', max: parseFloat(ohpMax) || 0 },
      ].filter(lift => lift.max > 0);

      if (initialMaxes.length > 0 && profile) {
        const sessionInserts = initialMaxes.map(lift => ({
          user_id: user.id,
          lift_type: lift.lift_type,
          cycle: 0,
          week: 0,
          weight_lifted: lift.max,
          reps_performed: 1,
          calculated_1rm: lift.max,
          completed_at: profile.created_at,
        }));

        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .insert(sessionInserts);

        if (sessionError) throw sessionError;
      }

      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to 5-3-1</h1>
          <p className="text-gray-600">Let's set up your training maxes (1RM)</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Don't know your maxes? Use our calculator after setup!</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bodyweight
              </label>
              <input
                type="number"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 180"
                required
              />
            </div>

            <div>
              <AccessibleNativeSelect
                id="gender-select"
                label="Gender"
                value={gender}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' }
                ]}
                onChange={setGender}
                description="Used to calculate accurate Wilks scores"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Squat - One Rep Max
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your absolute maximum weight for one repetition</p>
            <input
              type="number"
              value={squatMax}
              onChange={(e) => setSquatMax(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 315"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bench Press - One Rep Max
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your absolute maximum weight for one repetition</p>
            <input
              type="number"
              value={benchMax}
              onChange={(e) => setBenchMax(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 225"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deadlift - One Rep Max
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your absolute maximum weight for one repetition</p>
            <input
              type="number"
              value={deadliftMax}
              onChange={(e) => setDeadliftMax(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 405"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Overhead Press - One Rep Max
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your absolute maximum weight for one repetition</p>
            <input
              type="number"
              value={ohpMax}
              onChange={(e) => setOhpMax(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 135"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Preparing your program...' : 'Get Started'}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can adjust these anytime - don't worry about being exact
          </p>
        </form>
      </div>
    </div>
  );
}
