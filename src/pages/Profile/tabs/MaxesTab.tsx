import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { TRAINING_MAX_FACTOR, getRoundingIncrement } from '../../../lib/calculations';
import { useFormState } from '../../../hooks/useFormState';
import Card from '../../../components/ui/Card';
import SaveFeedback from '../../../components/ui/SaveFeedback';
import AccessibleModal from '../../../components/accessible/AccessibleModal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function MaxesTab() {
  const { profile, user, refreshProfile } = useAuth();
  const unit = profile?.unit_preference || 'lb';
  const roundTo = getRoundingIncrement(unit);

  const [squatMax, setSquatMax] = useState(profile?.squat_max?.toString() || '');
  const [benchMax, setBenchMax] = useState(profile?.bench_max?.toString() || '');
  const [deadliftMax, setDeadliftMax] = useState(profile?.deadlift_max?.toString() || '');
  const [squatTestedMax, setSquatTestedMax] = useState(profile?.squat_tested_max?.toString() || '');
  const [benchTestedMax, setBenchTestedMax] = useState(profile?.bench_tested_max?.toString() || '');
  const [deadliftTestedMax, setDeadliftTestedMax] = useState(profile?.deadlift_tested_max?.toString() || '');
  const { loading, error, saved, run, markUnsaved } = useFormState();
  const [showRestartModal, setShowRestartModal] = useState(false);

  const payload = () => ({
    squat_max: parseFloat(squatMax) || 0,
    bench_max: parseFloat(benchMax) || 0,
    deadlift_max: parseFloat(deadliftMax) || 0,
    squat_tested_max: parseFloat(squatTestedMax) || null,
    bench_tested_max: parseFloat(benchTestedMax) || null,
    deadlift_tested_max: parseFloat(deadliftTestedMax) || null,
    updated_at: new Date().toISOString(),
  });

  const save = (extraFields?: Record<string, unknown>) => {
    if (!user) return;
    run(async () => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ ...payload(), ...extraFields })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    }, extraFields ? 'Failed to restart program. Please try again.' : 'Failed to save maxes. Please try again.');
  };

  const handleSaveAndRestart = async () => {
    setShowRestartModal(false);
    await save({
      current_cycle: 1,
      current_week: 1,
      program_start_date: new Date().toISOString().split('T')[0],
    });
  };

  const recalcTm = (testedVal: string, setTm: (v: string) => void) => {
    const tested = parseFloat(testedVal);
    if (!tested || tested <= 0) return;
    const tm = Math.round((tested * TRAINING_MAX_FACTOR) / roundTo) * roundTo;
    setTm(String(tm));
    markUnsaved();
  };

  const liftRows = [
    { label: 'Squat',       testedVal: squatTestedMax,    setTested: setSquatTestedMax,    tmVal: squatMax,    setTm: setSquatMax },
    { label: 'Bench Press', testedVal: benchTestedMax,    setTested: setBenchTestedMax,    tmVal: benchMax,    setTm: setBenchMax },
    { label: 'Deadlift',    testedVal: deadliftTestedMax, setTested: setDeadliftTestedMax, tmVal: deadliftMax, setTm: setDeadliftMax },
  ];

  return (
    <div className="space-y-4 animate-enter">
      <Card className="p-5">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Tested max</span> is the best actual 1RM you've lifted. Your{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">training max (TM)</span> is what the program builds percentages from — typically 90% of your tested max.
        </p>
      </Card>

      {liftRows.map(({ label, testedVal, setTested, tmVal, setTm }) => {
        const tm = parseFloat(tmVal);
        const impliedOneRM = tm > 0 ? Math.round((tm / TRAINING_MAX_FACTOR) * 10) / 10 : null;
        return (
          <Card key={label} className="p-5 space-y-4">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">{label}</p>
            <div>
              <div className="flex gap-2 items-end">
                <Input
                  label={`Tested max (${unit})`}
                  type="number"
                  value={testedVal}
                  onChange={e => { setTested(e.target.value); markUnsaved(); }}
                  placeholder="e.g. 315"
                  min="0"
                  step="0.5"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => recalcTm(testedVal, setTm)}
                  disabled={!testedVal || parseFloat(testedVal) <= 0}
                  title="Set training max to 90% of tested max"
                >
                  → 90% TM
                </Button>
              </div>
            </div>
            <div>
              <Input
                label={`Training max (${unit})`}
                type="number"
                value={tmVal}
                onChange={e => { setTm(e.target.value); markUnsaved(); }}
                placeholder="e.g. 285"
                min="0"
                step="0.5"
              />
              {impliedOneRM && (
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1.5">
                  Implied 1RM: <span className="font-semibold text-gray-600 dark:text-gray-300">{impliedOneRM} {unit}</span>
                </p>
              )}
            </div>
          </Card>
        );
      })}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="w-1/3"
          onClick={() => save()}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={() => setShowRestartModal(true)} disabled={loading} className="w-2/3">
          Save & Restart Program
        </Button>
      </div>
      <p className="text-xs font-medium text-white dark:text-white/70 text-center">
        "Save & Restart Program" rebuilds your wave schedule from today
      </p>
      <SaveFeedback error={error} saved={saved} savedMessage="Maxes saved." />

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
          <Button variant="secondary" size="md" disabled={loading} className="flex-1" onClick={() => setShowRestartModal(false)}>
            Cancel
          </Button>
          <Button size="md" disabled={loading} className="flex-1" onClick={handleSaveAndRestart}>
            {loading ? 'Restarting...' : 'Save & Restart'}
          </Button>
        </div>
      </AccessibleModal>
    </div>
  );
}
