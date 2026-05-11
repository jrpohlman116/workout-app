import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { StickingPoint, WeakPoints } from '../../lib/supabase';
import { Eye, EyeOff, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { AnimationControls } from '../../components/accessible/ReducedMotionWrapper';
import AccessibleNativeSelect from '../../components/accessible/AccessibleNativeSelect';
import AccessibleModal from '../../components/accessible/AccessibleModal';

const STICKING_POINT_LABELS: Record<StickingPoint, string> = {
  in_the_hole: 'In the Hole',
  mid_range: 'Mid Range',
  lockout: 'Lockout',
};

const STICKING_POINTS: StickingPoint[] = ['in_the_hole', 'mid_range', 'lockout'];

const LIFT_LABELS: Record<keyof WeakPoints, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
};

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'body' | 'maxes' | 'training' | 'security'>('body');

  // Body stats
  const [bodyweight, setBodyweight] = useState(profile?.bodyweight?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [unitPreference, setUnitPreference] = useState(profile?.unit_preference || 'lb');
  const [bodyLoading, setBodyLoading] = useState(false);
  const [bodyError, setBodyError] = useState('');
  const [bodySaved, setBodySaved] = useState(false);

  // Maxes
  const [squatMax, setSquatMax] = useState(profile?.squat_max?.toString() || '');
  const [benchMax, setBenchMax] = useState(profile?.bench_max?.toString() || '');
  const [deadliftMax, setDeadliftMax] = useState(profile?.deadlift_max?.toString() || '');
  const [maxesLoading, setMaxesLoading] = useState(false);
  const [maxesError, setMaxesError] = useState('');
  const [maxesSaved, setMaxesSaved] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // Training settings
  const [meetDate, setMeetDate] = useState(profile?.meet_date || '');
  const [weakPoints, setWeakPoints] = useState<WeakPoints>(
    profile?.weak_points || { squat: [], bench: [], deadlift: [] }
  );
  const [trainingSaved, setTrainingSaved] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState('');

  // Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const toggleWeakPoint = (lift: keyof WeakPoints, point: StickingPoint) => {
    setWeakPoints(prev => {
      const current = prev[lift];
      const updated = current.includes(point)
        ? current.filter(p => p !== point)
        : [...current, point];
      return { ...prev, [lift]: updated };
    });
    setTrainingSaved(false);
  };

  const handleUpdateBodyweight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBodyLoading(true);
    setBodyError('');
    setBodySaved(false);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          bodyweight: parseFloat(bodyweight) || 0,
          gender,
          unit_preference: unitPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setBodySaved(true);
    } catch {
      setBodyError('Failed to save body stats. Please try again.');
    } finally {
      setBodyLoading(false);
    }
  };

  const handleSaveMaxes = async () => {
    if (!user) return;
    setMaxesLoading(true);
    setMaxesError('');
    setMaxesSaved(false);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          squat_max: parseFloat(squatMax) || 0,
          bench_max: parseFloat(benchMax) || 0,
          deadlift_max: parseFloat(deadliftMax) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setMaxesSaved(true);
    } catch {
      setMaxesError('Failed to save maxes. Please try again.');
    } finally {
      setMaxesLoading(false);
    }
  };

  const handleSaveMaxesAndRestart = async () => {
    if (!user) return;
    setShowRestartModal(false);
    setMaxesLoading(true);
    setMaxesError('');
    setMaxesSaved(false);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          squat_max: parseFloat(squatMax) || 0,
          bench_max: parseFloat(benchMax) || 0,
          deadlift_max: parseFloat(deadliftMax) || 0,
          current_cycle: 1,
          current_week: 1,
          program_start_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setMaxesSaved(true);
    } catch {
      setMaxesError('Failed to restart program. Please try again.');
    } finally {
      setMaxesLoading(false);
    }
  };

  const handleSaveTrainingSettings = async () => {
    if (!user) return;
    setTrainingLoading(true);
    setTrainingSaved(false);
    setTrainingError('');
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          meet_date: meetDate || null,
          weak_points: weakPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setTrainingSaved(true);
    } catch {
      setTrainingError('Failed to save training settings. Please try again.');
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match. Please try again.");
      return;
    }
    setSecurityLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setPasswordError('Failed to update password. Please try again.');
      } else {
        setPassword('');
        setConfirmPassword('');
        setPasswordSuccess(true);
      }
    } catch (err) {
      console.error('Error changing password:', err);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await supabase.from('workout_sessions').delete().eq('user_id', user.id);
      await supabase.from('accessory_exercises').delete().eq('user_id', user.id);
      await supabase.from('exercise_substitutions').delete().eq('user_id', user.id);
      await supabase.from('one_rm_test_sessions').delete().eq('user_id', user.id);
      await supabase.from('user_profiles').delete().eq('id', user.id);
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch {
      setDeleteError('Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!profile) return null;

  const lastUpdated = new Date(profile.updated_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const tabClass = (tab: typeof activeTab) =>
    `pb-3 font-semibold whitespace-nowrap transition-colors relative ${
      activeTab === tab
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">Profile</h1>
          <p className="text-gray-600 dark:text-gray-300">Update your profile and training settings</p>
        </div>

        <div className="max-w-md mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
            {(['body', 'maxes', 'training', 'security'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={tabClass(tab)}>
                {{ body: 'Body Stats', maxes: 'Tested Maxes', training: 'Training', security: 'Settings' }[tab]}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* ── Body Stats ── */}
        {activeTab === 'body' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Body Stats</h2>
            <form onSubmit={handleUpdateBodyweight} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Bodyweight
                </label>
                <div className="flex gap-3 items-end">
                  <input
                    type="number"
                    value={bodyweight}
                    onChange={e => setBodyweight(e.target.value)}
                    placeholder="e.g. 180"
                    min="0"
                    step="0.1"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={unitPreference}
                    onChange={e => setUnitPreference(e.target.value as 'lb' | 'kg')}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="lb">lb</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <AccessibleNativeSelect
                id="gender-select-profile"
                label="Gender"
                value={gender}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
                onChange={setGender}
                description="Used to calculate accurate Wilks scores"
              />
              <button
                type="submit"
                disabled={bodyLoading}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {bodyLoading ? 'Saving...' : 'Save Body Stats'}
              </button>
              {bodyError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">{bodyError}</p>
              )}
              {bodySaved && !bodyError && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm text-center">
                  Body stats saved.
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── Tested Maxes ── */}
        {activeTab === 'maxes' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tested Maxes</h2>
            <div className="space-y-4">
              {([
                ['Squat', squatMax, setSquatMax],
                ['Bench Press', benchMax, setBenchMax],
                ['Deadlift', deadliftMax, setDeadliftMax],
              ] as const).map(([label, value, setter]) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder="e.g. 315"
                      min="0"
                      step="0.5"
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                    <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {unitPreference}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-row gap-3">
                <button
                  onClick={handleSaveMaxes}
                  disabled={maxesLoading}
                  className="w-1/3 bg-gray-600 dark:bg-gray-500 text-white py-4 rounded-xl font-semibold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {maxesLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowRestartModal(true)}
                  disabled={maxesLoading}
                  className="w-2/3 bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Save & Restart Program
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-300 text-center">
                "Save & Restart Program" rebuilds your wave schedule from today
              </p>
              {maxesError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">{maxesError}</p>
              )}
              {maxesSaved && !maxesError && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm text-center">
                  Maxes saved.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Training Settings ── */}
        {activeTab === 'training' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Training Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your program is built around your meet date and tailored to your weak points.
              </p>
            </div>

            {/* Meet date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Meet / 1RM Test Date
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Your wave schedule will be arranged so the 3-rep peak lands the week before this date.
              </p>
              <input
                type="date"
                value={meetDate}
                onChange={e => { setMeetDate(e.target.value); setTrainingSaved(false); }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {meetDate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {Math.max(0, Math.floor(
                    (new Date(meetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
                  ))} weeks away
                </p>
              )}
            </div>

            {/* Weak points */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Sticking Points
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Select where each lift breaks down. Your accessories will target these zones.
              </p>
              <div className="space-y-4">
                {(Object.keys(LIFT_LABELS) as (keyof WeakPoints)[]).map(lift => (
                  <div key={lift}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {LIFT_LABELS[lift]}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {STICKING_POINTS.map(point => {
                        const selected = weakPoints[lift].includes(point);
                        return (
                          <button
                            key={point}
                            type="button"
                            onClick={() => toggleWeakPoint(lift, point)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              selected
                                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {STICKING_POINT_LABELS[point]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveTrainingSettings}
              disabled={trainingLoading}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {trainingLoading ? 'Saving...' : 'Save Training Settings'}
            </button>

            {trainingError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">{trainingError}</p>
            )}
            {trainingSaved && !trainingError && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm text-center">
                Training settings saved.
              </div>
            )}
          </div>
        )}

        {/* ── Settings / Security ── */}
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
                    {isDarkMode
                      ? <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      : <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    }
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
              onToggle={enabled => localStorage.setItem('animations-enabled', String(enabled))}
            />

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {([
                  ['Password', password, setPassword, showPassword, setShowPassword],
                  ['Confirm Password', confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword],
                ] as const).map(([label, value, setter, show, setShow]) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={show ? 'text' : 'password'}
                        value={value}
                        onChange={e => setter(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShow(!show)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={securityLoading || !password || !confirmPassword}
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Update Password
                </button>
                {passwordError && <p className="text-sm text-red-600 mt-2">{passwordError}</p>}
                {passwordSuccess && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm mt-2">
                    Password updated successfully.
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

            <p className="text-center text-sm text-gray-500 dark:text-gray-300">
              Last updated: {lastUpdated}
            </p>
          </>
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
            <p className="text-red-800 dark:text-red-300 font-semibold mb-2">Warning: This is permanent</p>
            <ul className="mt-2 text-red-700 dark:text-red-400 text-sm list-disc list-inside space-y-1">
              <li>All workout history and progress</li>
              <li>Personal records and maxes</li>
              <li>Custom exercises and substitutions</li>
              <li>Your account and profile data</li>
            </ul>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            This action cannot be reversed. Your data will be permanently deleted.
          </p>
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{deleteError}</p>
          )}
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

      <AccessibleModal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        title="Restart Program"
        description="Your wave schedule will reset to Cycle 1, Week 1"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your updated maxes will be saved and your program will restart from the beginning. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRestartModal(false)}
            disabled={maxesLoading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveMaxesAndRestart}
            disabled={maxesLoading}
            className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {maxesLoading ? 'Restarting...' : 'Save & Restart'}
          </button>
        </div>
      </AccessibleModal>
    </div>
  );
}
