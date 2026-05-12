import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AccessibleModal from '../../components/accessible/AccessibleModal';

interface AttemptRow {
  weight: string;
  made: boolean;
}

type LiftKey = 'squat' | 'bench' | 'deadlift';

const LIFTS: { key: LiftKey; label: string }[] = [
  { key: 'squat',    label: 'Squat' },
  { key: 'bench',    label: 'Bench Press' },
  { key: 'deadlift', label: 'Deadlift' },
];

const MAX_ATTEMPTS = 3;

const emptyAttempt = (): AttemptRow => ({ weight: '', made: true });

const emptyAttempts = (): Record<LiftKey, AttemptRow[]> => ({
  squat:    [emptyAttempt()],
  bench:    [emptyAttempt()],
  deadlift: [emptyAttempt()],
});

interface PastMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  unitPreference: string;
}

export default function PastMeetModal({ isOpen, onClose, onSaved, unitPreference }: PastMeetModalProps) {
  const { user, profile } = useAuth();
  const [meetDate, setMeetDate] = useState('');
  const [unit, setUnit] = useState<'lb' | 'kg'>(unitPreference === 'kg' ? 'kg' : 'lb');
  const [attempts, setAttempts] = useState<Record<LiftKey, AttemptRow[]>>(emptyAttempts());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setMeetDate('');
    setUnit(unitPreference === 'kg' ? 'kg' : 'lb');
    setAttempts(emptyAttempts());
    setError('');
    onClose();
  };

  const updateAttempt = (lift: LiftKey, idx: number, field: keyof AttemptRow, value: string | boolean) => {
    setAttempts(prev => {
      const updated = prev[lift].map((a, i) => i === idx ? { ...a, [field]: value } : a);
      return { ...prev, [lift]: updated };
    });
  };

  const addAttempt = (lift: LiftKey) => {
    setAttempts(prev => {
      if (prev[lift].length >= MAX_ATTEMPTS) return prev;
      return { ...prev, [lift]: [...prev[lift], emptyAttempt()] };
    });
  };

  const removeAttempt = (lift: LiftKey, idx: number) => {
    setAttempts(prev => {
      const updated = prev[lift].filter((_, i) => i !== idx);
      return { ...prev, [lift]: updated.length > 0 ? updated : [emptyAttempt()] };
    });
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    if (!meetDate) { setError('Please choose a meet date.'); return; }

    // Collect all attempts that have a weight entered
    const rows: {
      lift: LiftKey;
      weight: number;
      made: boolean;
    }[] = [];

    for (const { key } of LIFTS) {
      for (const attempt of attempts[key]) {
        const w = parseFloat(attempt.weight);
        if (w > 0) rows.push({ lift: key, weight: w, made: attempt.made });
      }
    }

    if (rows.length === 0) {
      setError('Enter at least one attempt with a weight.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Convert to the user's stored unit if the modal unit differs.
      // weight_lifted must always be in profile.unit_preference so the rest of
      // the app (charts, records, meets tab) displays it correctly.
      const prefUnit = profile.unit_preference === 'kg' ? 'kg' : 'lb';
      const toStoredUnit = (w: number): number => {
        if (unit === prefUnit) return w;
        if (unit === 'kg' && prefUnit === 'lb') return Math.round(w * 2.20462 * 10) / 10;
        // unit === 'lb' && prefUnit === 'kg'
        return Math.round(w * 0.453592 * 10) / 10;
      };

      // Use noon on the chosen date so timezone shifts don't roll to a different day
      const completedAt = `${meetDate}T12:00:00.000Z`;

      const inserts = rows.map(r => {
        const stored = toStoredUnit(r.weight);
        return {
          user_id: user.id,
          lift_type: r.lift,
          cycle: profile.current_cycle ?? 1,
          week: profile.current_week ?? 1,
          weight_lifted: stored,
          reps_performed: r.made ? 1 : 0,
          calculated_1rm: r.made ? stored : 0,
          is_1rm_test: true,
          completed_at: completedAt,
          created_at: new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabase
        .from('workout_sessions')
        .insert(inserts);

      if (insertError) throw insertError;

      onSaved();
      handleClose();
    } catch {
      setError('Failed to save meet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Log Past Meet"
      description="Enter your attempts for each lift"
      size="sm"
      preventClose={saving}
    >
      <div className="space-y-5">
        {/* Date + unit toggle */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Meet date
            </label>
            <input
              type="date"
              value={meetDate}
              onChange={e => setMeetDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex rounded-xl border border-gray-300 dark:border-gray-600 overflow-hidden flex-shrink-0">
            {(['lb', 'kg'] as const).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-4 py-3 text-sm font-semibold transition-colors ${
                  unit === u
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Per-lift attempt entry */}
        {LIFTS.map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-2">
              {label}
            </p>
            <div className="space-y-2">
              {attempts[key].map((attempt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Attempt number */}
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-4 text-right flex-shrink-0">
                    {idx + 1}
                  </span>

                  {/* Weight input */}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={attempt.weight}
                      onChange={e => updateAttempt(key, idx, 'weight', e.target.value)}
                      placeholder="Weight"
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                      {unit}
                    </span>
                  </div>

                  {/* Made / Missed toggle */}
                  <button
                    type="button"
                    onClick={() => updateAttempt(key, idx, 'made', !attempt.made)}
                    className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                      attempt.made
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {attempt.made ? 'Made' : 'Miss'}
                  </button>

                  {/* Remove row (only if more than 1 row) */}
                  {attempts[key].length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAttempt(key, idx)}
                      className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors text-lg leading-none"
                      aria-label="Remove attempt"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {attempts[key].length < MAX_ATTEMPTS && (
              <button
                type="button"
                onClick={() => addAttempt(key)}
                className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                + Add attempt
              </button>
            )}
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !meetDate}
            className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Meet'}
          </button>
        </div>
      </div>
    </AccessibleModal>
  );
}
