import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import Input from '../ui/Input';

const GRID_BG = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

/**
 * Shown instead of the normal app when Supabase fires a PASSWORD_RECOVERY
 * auth event (user arrived via a reset-password email link). The recovery
 * link already establishes a real session, so this only needs to collect
 * and set the new password — no re-entry of the (forgotten) old one.
 */
export default function ResetPasswordForm() {
  const { clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearPasswordRecovery();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('Password') && msg.includes('6')
          ? 'Your password needs at least 6 characters for security'
          : 'Something went wrong. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-blue-700 dark:bg-blue-900 flex flex-col justify-center px-8 py-12"
      style={GRID_BG}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-14">
          <h1 className="text-6xl font-black text-white leading-none tracking-tight">
            Ironform
          </h1>
          <p className="text-xs tracking-wide text-white/40 mt-3">
            Juggernaut Method
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-2">Set a new password</h2>
          <p className="text-sm text-white/60">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="block text-xs tracking-wide text-white/70 mb-2">
              New password
            </label>
            <p className="text-xs text-white/60 mb-2">Minimum 6 characters</p>
            <div className="relative">
              <Input
                id="new-password"
                variant="onDark"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="block text-xs tracking-wide text-white/70 mb-2">
              Confirm new password
            </label>
            <Input
              id="confirm-new-password"
              variant="onDark"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="border border-red-400/30 bg-red-900/20 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-white text-blue-700 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
