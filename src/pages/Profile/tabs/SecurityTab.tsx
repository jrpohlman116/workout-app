import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { Eye, EyeOff, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { AnimationControls } from '../../../components/accessible/ReducedMotionWrapper';
import Card from '../../../components/ui/Card';
import AccessibleModal from '../../../components/accessible/AccessibleModal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import IconButton from '../../../components/ui/IconButton';

export default function SecurityTab() {
  const { profile, user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const lastUpdated = profile
    ? new Date(profile.updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

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
      // Every user-owned table (user_profiles, workout_sessions, accessory_exercises,
      // workout_templates, fatigue_indicators, workout_perceptions, progress_predictions)
      // cascades from auth.users via ON DELETE CASCADE, so deleting the auth user is
      // the single source of truth — no manual per-table cleanup needed or wanted.
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-enter">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h2>
        <Button
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          onClick={toggleDarkMode}
          className="flex items-center justify-between border border-gray-300 dark:border-gray-500"
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
        </Button>
      </Card>

      <AnimationControls
        onToggle={enabled => localStorage.setItem('animations-enabled', String(enabled))}
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {([
            ['Password', password, setPassword, showPassword, setShowPassword],
            ['Confirm Password', confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword],
          ] as const).map(([label, value, setter, show, setShow]) => (
            <div key={label} className="relative">
              <Input
                label={label}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => setter(e.target.value)}
                className="pr-12"
              />
              <div className="absolute right-2 bottom-1">
                <IconButton
                  label={show ? 'Hide password' : 'Show password'}
                  type="button"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </IconButton>
              </div>
            </div>
          ))}
          <Button type="submit" fullWidth disabled={securityLoading || !password || !confirmPassword}>
            Update Password
          </Button>
          {passwordError && <p className="text-sm text-red-600 mt-2">{passwordError}</p>}
          {passwordSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm mt-2">
              Password updated successfully.
            </div>
          )}
        </form>
      </Card>

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        icon={<LogOut className="w-5 h-5" />}
        onClick={() => setShowSignOutModal(true)}
      >
        Sign Out
      </Button>

      <Button
        variant="danger"
        size="lg"
        fullWidth
        icon={<Trash2 className="w-5 h-5" />}
        onClick={() => setShowDeleteModal(true)}
      >
        Delete Account
      </Button>

      <p className="text-center text-sm text-white/40">Last updated: {lastUpdated}</p>

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
          <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowSignOutModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="md" className="flex-1" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </AccessibleModal>

      <AccessibleModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(''); }}
        title="Delete Account"
        description="This action cannot be undone"
        size="sm"
        preventClose={deleteLoading}
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
          <div>
            <label
              htmlFor="delete-confirm-input"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={10}
              aria-describedby="delete-confirm-hint"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
            />
            <p id="delete-confirm-hint" className="sr-only">
              Type the word DELETE in capital letters to enable the delete button.
            </p>
          </div>
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{deleteError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" size="md" className="flex-1" disabled={deleteLoading} onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(''); }}>
              Cancel
            </Button>
            <Button variant="danger" size="md" className="flex-1" disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'DELETE'} onClick={handleDeleteAccount}>
              {deleteLoading ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </AccessibleModal>
    </div>
  );
}
