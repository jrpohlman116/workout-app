import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [squatMax, setSquatMax] = useState(profile?.squat_max?.toString() || '');
  const [benchMax, setBenchMax] = useState(profile?.bench_max?.toString() || '');
  const [deadliftMax, setDeadliftMax] = useState(profile?.deadlift_max?.toString() || '');
  const [ohpMax, setOhpMax] = useState(profile?.ohp_max?.toString() || '');
  const [bodyweight, setBodyweight] = useState(profile?.bodyweight?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [currentCycle, setCurrentCycle] = useState(profile?.current_cycle?.toString() || '1');
  const [currentWeek, setCurrentWeek] = useState(profile?.current_week?.toString() || '1');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bodyLoading, setBodyLoading] = useState(false);

  const handleUpdateBodyweight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setBodyLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          bodyweight: parseFloat(bodyweight) || 0,
          gender: gender,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating bodyweight:', error);
    } finally {
      setBodyLoading(false);
    }
  };

  const handleUpdateLifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          squat_max: parseFloat(squatMax) || 0,
          bench_max: parseFloat(benchMax) || 0,
          deadlift_max: parseFloat(deadliftMax) || 0,
          ohp_max: parseFloat(ohpMax) || 0,
          current_cycle: 1,
          current_week: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
        setCurrentCycle('1');
        setCurrentWeek('1');
      }
    } catch (error) {
      console.error('Error updating lifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cycle = parseInt(currentCycle);
    const week = parseInt(currentWeek);

    if (cycle < 1 || week < 1 || week > 4) {
      alert('Please enter valid values (Cycle: 1+, Week: 1-4)');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          current_cycle: cycle,
          current_week: week,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (!error) {
        setPassword('');
        setConfirmPassword('');
        alert('Password updated successfully');
      }
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const lastUpdated = new Date(profile.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Profile</h1>
          <p className="text-gray-600">Update your profile and lifts</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Progress</h2>
          <form onSubmit={handleUpdateProgress} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Cycle
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentCycle}
                  onChange={(e) => setCurrentCycle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Week
                </label>
                <select
                  value={currentWeek}
                  onChange={(e) => setCurrentWeek(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Update Progress
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bodyweight & Gender</h2>
          <form onSubmit={handleUpdateBodyweight} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bodyweight
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  placeholder="e.g. 180"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <button
              type="submit"
              disabled={bodyLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Update
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Update your lifts</h2>
          <form onSubmit={handleUpdateLifts} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Squat
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={squatMax}
                  onChange={(e) => setSquatMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>lb</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bench Press
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={benchMax}
                  onChange={(e) => setBenchMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>lb</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deadlift
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={deadliftMax}
                  onChange={(e) => setDeadliftMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>lb</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Overhead Press
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={ohpMax}
                  onChange={(e) => setOhpMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>lb</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Update
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full border-2 border-blue-600 text-blue-600 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              Change
            </button>
          </form>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-600 text-red-600 py-4 rounded-2xl font-semibold hover:bg-red-50 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>

        <p className="text-center text-sm text-gray-500">
          Last updated: {lastUpdated}
        </p>
      </div>
    </div>
  );
}
