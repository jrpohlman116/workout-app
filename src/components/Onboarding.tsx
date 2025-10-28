import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
      const { error } = await supabase
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
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }
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
          <p className="text-sm text-gray-500 mt-1">Don't know your maxes? Use our calculator after setup!</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bodyweight
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 180"
                  required
                />
                <select className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>lb</option>
                  <option>kg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Squat - One Rep Max
            </label>
            <p className="text-xs text-gray-500 mb-2">Your absolute maximum weight for one repetition</p>
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
            <p className="text-xs text-gray-500 mb-2">Your absolute maximum weight for one repetition</p>
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
            <p className="text-xs text-gray-500 mb-2">Your absolute maximum weight for one repetition</p>
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
            <p className="text-xs text-gray-500 mb-2">Your absolute maximum weight for one repetition</p>
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

          <p className="text-xs text-gray-500 text-center">
            You can adjust these anytime - don't worry about being exact
          </p>
        </form>
      </div>
    </div>
  );
}
