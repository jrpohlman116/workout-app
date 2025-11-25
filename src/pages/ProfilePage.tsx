import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'body' | 'maxes' | 'security'>('body');
  const [squatMax, setSquatMax] = useState(profile?.squat_max?.toString() || '');
  const [benchMax, setBenchMax] = useState(profile?.bench_max?.toString() || '');
  const [deadliftMax, setDeadliftMax] = useState(profile?.deadlift_max?.toString() || '');
  const [ohpMax, setOhpMax] = useState(profile?.ohp_max?.toString() || '');
  const [bodyweight, setBodyweight] = useState(profile?.bodyweight?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [unitPreference, setUnitPreference] = useState(profile?.unit_preference || 'lb');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
          unit_preference: unitPreference,
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

  const handleSaveMaxes = async () => {
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating lifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaxesAndRestart = async () => {
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
      }
    } catch (error) {
      console.error('Error updating lifts:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (password !== confirmPassword) {
      setPasswordError('Passwords don\'t match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setPasswordError('Failed to update password. Please try again.');
      } else {
        setPassword('');
        setConfirmPassword('');
        setPasswordSuccess(true);
      }
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
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

        <div className="max-w-md mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto border-b border-gray-200">
            <button
              onClick={() => setActiveTab('body')}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === 'body'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Body Stats
              {activeTab === 'body' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('maxes')}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === 'maxes'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tested Maxes
              {activeTab === 'maxes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === 'security'
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Security
              {activeTab === 'security' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {activeTab === 'body' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Body Stats</h2>
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
                <select
                  value={unitPreference}
                  onChange={(e) => setUnitPreference(e.target.value as 'lb' | 'kg')}
                  className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
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
              Save Body Stats
            </button>
          </form>
        </div>
        )}

        {activeTab === 'maxes' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tested Maxes</h2>
          <div className="space-y-4">

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
                <div className="px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600">
                  {unitPreference}
                </div>
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
                <div className="px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600">
                  {unitPreference}
                </div>
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
                <div className="px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600">
                  {unitPreference}
                </div>
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
                <div className="px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600">
                  {unitPreference}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-row gap-3">
                <button
                  onClick={handleSaveMaxes}
                  disabled={loading}
                  className="w-1/3 bg-gray-600 text-white py-4 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Save Maxes
                </button>
                <button
                  onClick={handleSaveMaxesAndRestart}
                  disabled={loading}
                  className="w-2/3 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Save and Restart Plan
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                "Save and Restart Plan" will reset your progress to Cycle 1, Week 1
              </p>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'security' && (
        <>
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
              Update Password
            </button>
            {passwordError && (
              <p className="text-sm text-red-600 mt-2">{passwordError}</p>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mt-2">
                Password updated! You can now use it to log in.
              </div>
            )}
          </form>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-600 text-red-600 py-4 rounded-2xl font-semibold hover:bg-red-50 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
        </>
        )}

        {activeTab === 'security' && (
        <p className="text-center text-sm text-gray-500">
          Last updated: {lastUpdated}
        </p>
        )}
      </div>
    </div>
  );
}
