import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { AnimationControls } from '../../components/accessible/ReducedMotionWrapper';
import AccessibleNativeSelect from '../../components/accessible/AccessibleNativeSelect';
import AccessibleModal from '../../components/accessible/AccessibleModal';

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'body' | 'maxes' | 'variation' | 'security'>('body');
  const [squatMax, setSquatMax] = useState(profile?.squat_max?.toString() || '');
  const [benchMax, setBenchMax] = useState(profile?.bench_max?.toString() || '');
  const [deadliftMax, setDeadliftMax] = useState(profile?.deadlift_max?.toString() || '');
  const [ohpMax, setOhpMax] = useState(profile?.ohp_max?.toString() || '');
  const [bodyweight, setBodyweight] = useState(profile?.bodyweight?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [unitPreference, setUnitPreference] = useState(profile?.unit_preference || 'lb');
  const [programVariation, setProgramVariation] = useState<'standard' | 'bbb' | 'bbs'>(profile?.program_variation || 'standard');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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


  const handleUpdateProgramVariation = async (newVariation: 'standard' | 'bbb' | 'bbs') => {
    if (!user) return;

    setProgramVariation(newVariation);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          program_variation: newVariation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (!error) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating program variation:', error);
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
    setShowSignOutModal(false);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleteLoading(true);
    try {
      await supabase.from('workout_sessions').delete().eq('user_id', user.id);
      await supabase.from('accessory_exercises').delete().eq('user_id', user.id);
      await supabase.from('exercise_substitutions').delete().eq('user_id', user.id);
      await supabase.from('one_rm_test_sessions').delete().eq('user_id', user.id);
      await supabase.from('user_profiles').delete().eq('id', user.id);

      const { error: deleteError } = await supabase.rpc('delete_user');

      if (deleteError) {
        console.error('Error deleting account:', deleteError);
      }

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteAccountModal(false);
    }
  };

  if (!profile) return null;

  const lastUpdated = new Date(profile.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">Profile</h1>
          <p className="text-gray-600 dark:text-gray-300">Update your profile and lifts</p>
        </div>

        <div className="max-w-md mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('body')}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === 'body'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
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
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Tested Maxes
              {activeTab === 'maxes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('variation')}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === 'variation'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Variation
              {activeTab === 'variation' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === 'security'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Settings
              {activeTab === 'security' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {activeTab === 'body' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Body Stats</h2>
          <form onSubmit={handleUpdateBodyweight} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Bodyweight
              </label>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input
                    type="number"
                    value={bodyweight}
                    onChange={(e) => setBodyweight(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={unitPreference}
                  onChange={(e) => setUnitPreference(e.target.value as 'lb' | 'kg')}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div>
              <AccessibleNativeSelect
                id="gender-select-profile"
                label="Gender"
                value={gender}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' }
                ]}
                onChange={setGender}
                description="Used to calculate accurate Wilks scores"
              />
            </div>

            <button
              type="submit"
              disabled={bodyLoading}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Save Body Stats
            </button>
          </form>
        </div>
        )}

        {activeTab === 'maxes' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tested Maxes</h2>
          <div className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Squat
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={squatMax}
                  onChange={(e) => setSquatMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {unitPreference}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Bench Press
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={benchMax}
                  onChange={(e) => setBenchMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {unitPreference}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Deadlift
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={deadliftMax}
                  onChange={(e) => setDeadliftMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {unitPreference}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Overhead Press
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={ohpMax}
                  onChange={(e) => setOhpMax(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {unitPreference}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-row gap-3">
                <button
                  onClick={handleSaveMaxes}
                  disabled={loading}
                  className="w-1/3 bg-gray-600 dark:bg-gray-500 text-white py-4 rounded-xl font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Save Maxes
                </button>
                <button
                  onClick={handleSaveMaxesAndRestart}
                  disabled={loading}
                  className="w-2/3 bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Save and Restart Plan
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-300 text-center">
                "Save and Restart Plan" will reset your progress to Cycle 1, Week 1
              </p>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'variation' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Program Variation</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Choose your preferred 5/3/1 variation. You can switch mid-cycle at any time.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleUpdateProgramVariation('standard')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                programVariation === 'standard'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Standard 5/3/1</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Traditional program with main lift followed by 4 accessory exercises
                  </p>
                </div>
                {programVariation === 'standard' && (
                  <div className="ml-3 w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handleUpdateProgramVariation('bbb')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                programVariation === 'bbb'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Boring But Big (BBB)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Main lift + 5x10 supplemental at 50% TM (same lift) + 2 minimal accessories
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Focus: Volume and hypertrophy
                  </p>
                </div>
                {programVariation === 'bbb' && (
                  <div className="ml-3 w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handleUpdateProgramVariation('bbs')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                programVariation === 'bbs'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Boring But Strong (BBS)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Main lift + 10x5 supplemental at FSL weight (same lift) + 2 minimal accessories
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Focus: Strength and volume
                  </p>
                </div>
                {programVariation === 'bbs' && (
                  <div className="ml-3 w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
        )}

        {activeTab === 'security' && (
        <>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h2>
          <div className="space-y-4">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-300">
                {isDarkMode ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </div>

        <AnimationControls
          onToggle={(enabled) => {
            localStorage.setItem('animations-enabled', String(enabled));
          }}
        />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Update Password
            </button>
            {passwordError && (
              <p className="text-sm text-red-600 mt-2">{passwordError}</p>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm mt-2">
                Password updated! You can now use it to log in.
              </div>
            )}
          </form>
        </div>

        <button
          onClick={() => setShowSignOutModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 py-4 rounded-2xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>

        <button
          onClick={() => setShowDeleteAccountModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 py-4 rounded-2xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
        >
          <Trash2 className="w-5 h-5" />
          Delete Account
        </button>
        </>
        )}

        {activeTab === 'security' && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-300">
          Last updated: {lastUpdated}
        </p>
        )}
      </div>

      <AccessibleModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          You will need to sign in again to access your workout data.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSignOutModal(false)}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSignOut}
            className="flex-1 px-4 py-3 bg-red-600 dark:bg-red-500 text-white rounded-xl font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </AccessibleModal>

      <AccessibleModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        title="Delete Account"
        description="This action cannot be undone"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
            <p className="text-red-800 dark:text-red-300 font-semibold mb-2">
              Warning: This is permanent
            </p>
            <p className="text-red-700 dark:text-red-400 text-sm">
              Deleting your account will permanently remove:
            </p>
            <ul className="mt-2 text-red-700 dark:text-red-400 text-sm list-disc list-inside space-y-1">
              <li>All workout history and progress</li>
              <li>Personal records and maxes</li>
              <li>Custom exercises and substitutions</li>
              <li>Your account and profile data</li>
            </ul>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm">
            This action cannot be reversed. Your data will be permanently deleted from our servers.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteAccountModal(false)}
              disabled={deleteLoading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="flex-1 px-4 py-3 bg-red-600 dark:bg-red-500 text-white rounded-xl font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </AccessibleModal>
    </div>
  );
}
