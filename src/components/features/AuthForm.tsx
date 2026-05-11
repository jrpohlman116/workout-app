import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

const GRID_BG = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError("We couldn't find an account with those credentials. Please try again.");
      } else if (msg.includes('User already registered')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (msg.includes('Password') && msg.includes('6')) {
        setError('Your password needs at least 6 characters for security');
      } else if (msg.includes('Email')) {
        setError('Please enter a valid email address');
      } else {
        setError('Something went wrong. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `pb-3 font-semibold text-sm transition-colors ${
      active
        ? 'text-white border-b-2 border-white -mb-px'
        : 'text-white/40 hover:text-white/60'
    }`;

  const inputClass =
    'w-full bg-transparent border border-white/25 text-white placeholder:text-white/25 rounded-xl px-4 py-4 focus:border-white/60 focus:outline-none transition-colors';

  return (
    <div
      className="min-h-screen bg-blue-700 dark:bg-blue-900 flex flex-col justify-center px-8 py-12"
      style={GRID_BG}
    >
      <div className="w-full max-w-sm mx-auto">

        <div className="mb-14">
          <h1 className="text-6xl font-black text-white leading-none tracking-tight">
            Juggernaut
          </h1>
          <p className="text-xs uppercase tracking-widest text-white/40 mt-3">
            Juggernaut Method
          </p>
        </div>

        <div className="flex border-b border-white/20 mb-8 gap-8">
          <button type="button" onClick={() => setIsLogin(true)} className={tabClass(isLogin)}>
            Log in
          </button>
          <button type="button" onClick={() => setIsLogin(false)} className={tabClass(!isLogin)}>
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
              Password
            </label>
            {!isLogin && (
              <p className="text-xs text-white/35 mb-2">Minimum 6 characters</p>
            )}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-12`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="border border-red-400/30 bg-red-900/20 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-blue-700 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isLogin ? 'Signing in...' : 'Creating account...'
                : isLogin ? 'Log in' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
