import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { MS_PER_WEEK } from '../../../lib/calculations';
import { useFormState } from '../../../hooks/useFormState';
import SaveFeedback from '../../../components/ui/SaveFeedback';
import type { StickingPoint, WeakPoints } from '../../../lib/supabase';
import { DEFAULT_SPLIT_STYLE, type SplitStyle } from '../../../lib/exercises';
import { restartProgram, resetDefaultTemplates } from '../../../lib/programs/restart';
import { getProgram, DEFAULT_PROGRAM_ID, DEFAULT_DAYS_PER_WEEK } from '../../../lib/programs/registry';
import type { DaysPerWeek, ProgramId } from '../../../lib/programs/types';
import ProgramPicker from '../../../components/features/ProgramPicker';
import WeakPointPicker, { type MainLiftKey } from '../../../components/features/WeakPointPicker';
import AccessibleModal from '../../../components/accessible/AccessibleModal';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const SPLIT_OPTIONS: { value: SplitStyle; label: string; description: string }[] = [
  { value: 'upper_lower', label: 'Upper / lower', description: 'Squat variations on deadlift day, deadlift variations on squat day, bench variations on overhead press day.' },
  { value: 'full_body', label: 'Full body', description: 'Every day mixes squat, bench and deadlift variation work for your sticking points, plus general support.' },
];

export default function TrainingTab() {
  const { profile, user, refreshProfile } = useAuth();
  const [meetDate, setMeetDate] = useState(profile?.meet_date || '');
  const [weakPoints, setWeakPoints] = useState<WeakPoints>(
    profile?.weak_points || { squat: [], bench: [], deadlift: [] }
  );
  const [splitStyle, setSplitStyle] = useState<SplitStyle>(profile?.split_style ?? DEFAULT_SPLIT_STYLE);
  const currentProgramId: ProgramId = getProgram(profile?.program_id).id;
  const currentDays: DaysPerWeek = profile?.days_per_week ?? DEFAULT_DAYS_PER_WEEK;
  const [programId, setProgramId] = useState<ProgramId>(currentProgramId ?? DEFAULT_PROGRAM_ID);
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek>(currentDays);
  // Switching program or days re-lays-out the whole week, so it only takes
  // effect through a restart (back to week 1); plain Save leaves it alone.
  const layoutChanged = programId !== currentProgramId || daysPerWeek !== currentDays;
  const { loading, error, saved, run, markUnsaved } = useFormState();
  const [showRestartModal, setShowRestartModal] = useState(false);

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

  const handleSave = (restart = false) => {
    if (!user) return;
    run(async () => {
      if (restart) {
        // Rewinds position to week 1 in one place; see restartProgram.
        await restartProgram(
          user.id,
          { meetDate: meetDate || null, weakPoints, splitStyle, programId, daysPerWeek },
          { programId: currentProgramId, daysPerWeek: currentDays, splitStyle: profile?.split_style ?? DEFAULT_SPLIT_STYLE }
        );
      } else {
        const updatePayload: Record<string, unknown> = {
          meet_date: meetDate || null,
          weak_points: weakPoints,
          split_style: splitStyle,
          updated_at: new Date().toISOString(),
        };
        if (meetDate && !profile?.program_start_date) {
          updatePayload.program_start_date = new Date().toISOString().split('T')[0];
        }
        // Adding or clearing a meet date swaps the schedule (a meet-date plan or a
        // repeating one), so the stored week index no longer points at the same
        // week. Clear it: a new meet-date plan starts from today, and a repeating
        // one picks up from the stored cycle and week.
        if (!!meetDate !== !!profile?.meet_date) {
          updatePayload.current_week_index = null;
        }
        const { error } = await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', user.id);
        if (error) throw error;
        if (splitStyle !== (profile?.split_style ?? DEFAULT_SPLIT_STYLE)) {
          await resetDefaultTemplates(user.id);
        }
      }
      await refreshProfile();
    }, restart ? 'Failed to restart program. Please try again.' : 'Failed to save training settings. Please try again.');
  };

  const handleSaveAndRestart = () => {
    setShowRestartModal(false);
    handleSave(true);
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
        <ProgramPicker
          idPrefix="profile"
          programId={programId}
          daysPerWeek={daysPerWeek}
          onChange={next => { setProgramId(next.programId); setDaysPerWeek(next.daysPerWeek); markUnsaved(); }}
        />
        {layoutChanged && (
          <p role="status" className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-3">
            Changing your program or days per week restarts your program at week 1. Use "Save &amp; restart program" below to switch.
          </p>
        )}
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
        {!Object.values(weakPoints).some(points => points.length > 0) && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-3">
            Select at least one sticking point below first — the split only changes which variations are picked for them.
          </p>
        )}
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

      <div className="flex gap-3">
        <Button variant="secondary" className="w-1/3" onClick={() => handleSave()} disabled={loading || layoutChanged}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
        <Button onClick={() => setShowRestartModal(true)} disabled={loading} className="w-2/3">
          Save & restart program
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        "Save & restart program" rebuilds your wave schedule from today
      </p>
      <SaveFeedback error={error} saved={saved} savedMessage="Training settings saved." />

      <AccessibleModal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        title="Restart program"
        description="Your wave schedule will reset to cycle 1, week 1"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {layoutChanged
            ? `You're switching to ${getProgram(programId).name}, ${daysPerWeek} days a week. `
            : ''}
          Your training settings will be saved and your program will restart from the beginning. Workouts will show as incomplete until you log them again. Your history and training maxes are kept.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" disabled={loading} className="flex-1" onClick={() => setShowRestartModal(false)}>
            Cancel
          </Button>
          <Button size="md" disabled={loading} className="flex-1" onClick={handleSaveAndRestart}>
            {loading ? 'Restarting...' : 'Save & restart'}
          </Button>
        </div>
      </AccessibleModal>
    </Card>
  );
}
