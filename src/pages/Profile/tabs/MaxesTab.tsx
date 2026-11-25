import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { TRAINING_MAX_FACTOR, getRoundingIncrement } from '../../../lib/calculations';
import { hasTrainingMax } from '../../../lib/programs/maxes';
import { useFormState } from '../../../hooks/useFormState';
import Card from '../../../components/ui/Card';
import SaveFeedback from '../../../components/ui/SaveFeedback';
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
  // Overhead press is optional. A placeholder value without a tested max
  // doesn't count as a max (see trainingMaxFor), so it isn't shown.
  const ohpSet = hasTrainingMax(profile ?? {}, 'ohp');
  const [ohpMax, setOhpMax] = useState(ohpSet ? profile?.ohp_max?.toString() || '' : '');
  const [ohpTestedMax, setOhpTestedMax] = useState(ohpSet ? profile?.ohp_tested_max?.toString() || '' : '');
  const { loading, error, saved, run, markUnsaved } = useFormState();

  // The two OHP fields are saved as a pair: a lone value fills in the other
  // (training max = 90% of tested max), and clearing both removes the max.
  const ohpPair = () => {
    const tested = parseFloat(ohpTestedMax);
    const tm = parseFloat(ohpMax);
    if (tested > 0 && tm > 0) return { ohp_max: tm, ohp_tested_max: tested };
    if (tested > 0) return { ohp_max: Math.round((tested * TRAINING_MAX_FACTOR) / roundTo) * roundTo, ohp_tested_max: tested };
    if (tm > 0) return { ohp_max: tm, ohp_tested_max: Math.round((tm / TRAINING_MAX_FACTOR) * 10) / 10 };
    return { ohp_max: null, ohp_tested_max: null };
  };

  const payload = () => ({
    squat_max: parseFloat(squatMax) || 0,
    bench_max: parseFloat(benchMax) || 0,
    deadlift_max: parseFloat(deadliftMax) || 0,
    squat_tested_max: parseFloat(squatTestedMax) || null,
    bench_tested_max: parseFloat(benchTestedMax) || null,
    deadlift_tested_max: parseFloat(deadliftTestedMax) || null,
    ...ohpPair(),
    updated_at: new Date().toISOString(),
  });

  const save = () => {
    if (!user) return;
    run(async () => {
      const { error } = await supabase
        .from('user_profiles')
        .update(payload())
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    }, 'Failed to save maxes. Please try again.');
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
    { label: 'Overhead press (optional)', testedVal: ohpTestedMax, setTested: setOhpTestedMax, tmVal: ohpMax, setTm: setOhpMax },
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
            <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400">{label}</p>
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

      <Button fullWidth onClick={save} disabled={loading}>
        {loading ? 'Saving…' : 'Save'}
      </Button>
      <SaveFeedback error={error} saved={saved} savedMessage="Maxes saved." />
    </div>
  );
}
