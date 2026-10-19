import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { MS_PER_WEEK } from '../../../lib/calculations';
import { useFormState } from '../../../hooks/useFormState';
import SaveFeedback from '../../../components/ui/SaveFeedback';
import type { StickingPoint, WeakPoints } from '../../../lib/supabase';
import { DEFAULT_SPLIT_STYLE, type SplitStyle } from '../../../lib/exercises';
import WeakPointPicker, { type MainLiftKey } from '../../../components/features/WeakPointPicker';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const SPLIT_OPTIONS: { value: SplitStyle; label: string; description: string }[] = [
  { value: 'upper_lower', label: 'Upper / lower', description: 'Squat variations on deadlift day, deadlift variations on squat day, bench variations on upper day.' },
  { value: 'full_body', label: 'Full body', description: 'Squat variations move to the upper day alongside bench work. Deadlift day gets general support only.' },
];

export default function TrainingTab() {
  const { profile, user, refreshProfile } = useAuth();
  const [meetDate, setMeetDate] = useState(profile?.meet_date || '');
  const [weakPoints, setWeakPoints] = useState<WeakPoints>(
    profile?.weak_points || { squat: [], bench: [], deadlift: [] }
  );
  const [splitStyle, setSplitStyle] = useState<SplitStyle>(profile?.split_style ?? DEFAULT_SPLIT_STYLE);
  const { loading, error, saved, run, markUnsaved } = useFormState();

  const toggleWeakPoint = (lift: MainLiftKey, point: StickingPoint) => {
    setWeakPoints(prev => {
      const current = prev[lift];
      const updated = current.includes(point)
        ? current.filter(p => p !== point)
        : [...current, point];
      return { ...prev, [lift]: updated };
    });
    markUnsaved();
  };

  const handleSave = () => {
    if (!user) return;
    run(async () => {
      const today = new Date().toISOString().split('T')[0];
      const updatePayload: Record<string, unknown> = {
        meet_date: meetDate || null,
        weak_points: weakPoints,
        split_style: splitStyle,
        updated_at: new Date().toISOString(),
      };
      if (meetDate && !profile?.program_start_date) {
        updatePayload.program_start_date = today;
      }
      const { error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', user.id);
      if (error) throw error;
      // A new split re-lays-out every day, so it replaces any custom
      // accessory lists rather than being silently masked by them.
      if (splitStyle !== (profile?.split_style ?? DEFAULT_SPLIT_STYLE)) {
        const { error: resetError } = await supabase
          .from('workout_templates')
          .delete()
          .eq('user_id', user.id)
          .eq('program_variation', 'standard');
        if (resetError) throw resetError;
      }
      await refreshProfile();
    }, 'Failed to save training settings. Please try again.');
  };

  return (
    <Card className="p-6 space-y-6 animate-enter">
      <div>
        <h2 className="text-h4 text-gray-900 dark:text-gray-100 mb-1">Training Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your program is built around your meet date and tailored to your sticking points.
        </p>
      </div>

      <div>
        <Input
          label="Meet / 1RM Test Date"
          type="date"
          value={meetDate}
          onChange={e => { setMeetDate(e.target.value); markUnsaved(); }}
          hint="Your wave schedule will be arranged so the 3-rep peak lands the week before this date."
        />
        {meetDate && (
          <p className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300 mt-1">
            {Math.max(0, Math.floor(
              (new Date(meetDate).getTime() - Date.now()) / MS_PER_WEEK
            ))} weeks away
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Training Split</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Where your accessory variation work goes. Changing this replaces any custom accessory lists you've saved.
        </p>
        <div role="radiogroup" aria-label="Training split" className="grid grid-cols-1 gap-2">
          {SPLIT_OPTIONS.map(option => {
            const selected = splitStyle === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => { setSplitStyle(option.value); markUnsaved(); }}
                className={`px-3 py-2 rounded-lg transition-all text-left ${
                  selected
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs font-normal opacity-60 mt-0.5">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sticking Points</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Select where each lift breaks down. Your accessories will target these zones.
        </p>
        <WeakPointPicker value={weakPoints} onToggle={toggleWeakPoint} />
      </div>

      <Button fullWidth onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Training Settings'}
      </Button>
      <SaveFeedback error={error} saved={saved} savedMessage="Training settings saved." />
    </Card>
  );
}
