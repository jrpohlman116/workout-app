import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateWarmupSets, WarmupFeel } from '../../lib/calculations';
import { Activity } from 'lucide-react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Input from '../ui/Input';
import Tile from '../ui/Tile';

interface OneRepMaxTestProps {
  onClose: () => void;
  onComplete: () => void;
}

type LiftType = 'squat' | 'bench' | 'deadlift';
type Step = 'select' | 'warmup' | 'attempt' | 'complete';

const LIFTS: {
  name: string;
  type: LiftType;
  maxKey: 'squat_max' | 'bench_max' | 'deadlift_max';
  testedMaxKey: 'squat_tested_max' | 'bench_tested_max' | 'deadlift_tested_max';
}[] = [
  { name: 'Squat',       type: 'squat',    maxKey: 'squat_max',    testedMaxKey: 'squat_tested_max' },
  { name: 'Bench Press', type: 'bench',    maxKey: 'bench_max',    testedMaxKey: 'bench_tested_max' },
  { name: 'Deadlift',    type: 'deadlift', maxKey: 'deadlift_max', testedMaxKey: 'deadlift_tested_max' },
];

export default function OneRepMaxTest({ onClose, onComplete }: OneRepMaxTestProps) {
  const { profile, user, refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>('select');
  const [selectedLift, setSelectedLift] = useState<LiftType | null>(null);
  const [plannedAttempt, setPlannedAttempt] = useState('');
  const [warmupFeel, setWarmupFeel] = useState<WarmupFeel | null>(null);
  const [approachFeel, setApproachFeel] = useState<WarmupFeel | null>(null);
  const [attemptResult, setAttemptResult] = useState<'success' | 'fail' | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!profile || !user) return null;

  const unit = profile.unit_preference || 'lb';
  const roundTo = unit === 'kg' ? 2.5 : 5;

  const selectedLiftConfig = selectedLift ? LIFTS.find(l => l.type === selectedLift)! : null;
  // Use the tested max (actual 1RM) as the base for opener suggestions when available,
  // otherwise fall back to implied 1RM derived from the training max (TM / 0.9).
  const currentTestedMax = selectedLiftConfig
    ? (profile[selectedLiftConfig.testedMaxKey] ?? 0)
    : 0;
  const currentTM = selectedLiftConfig ? profile[selectedLiftConfig.maxKey] : 0;
  const currentMax = currentTestedMax > 0 ? currentTestedMax : Math.round((currentTM / 0.9) / roundTo) * roundTo;

  const suggestedOpening = Math.round((currentMax * 0.9) / roundTo) * roundTo;
  const suggestedSecond = Math.round((currentMax * 0.95) / roundTo) * roundTo;

  const planned = parseFloat(plannedAttempt) || 0;
  const warmup = planned > 0 ? calculateWarmupSets(planned, unit) : null;
  const approachWeight = warmup && warmupFeel ? warmup.getApproachWeight(warmupFeel) : null;
  const adjustedAttempt = warmup && warmupFeel && approachFeel
    ? warmup.getAdjustedWorkingWeight(warmupFeel, approachFeel)
    : null;

  const handleSelectLift = (lift: LiftType) => {
    setSelectedLift(lift);
    const config = LIFTS.find(l => l.type === lift)!;
    const tested = profile[config.testedMaxKey] ?? 0;
    const tm = profile[config.maxKey];
    // Pre-fill with suggested opener (90% of tested max, or 90% of implied 1RM)
    const base = tested > 0 ? tested : Math.round((tm / 0.9) / roundTo) * roundTo;
    setPlannedAttempt(String(Math.round((base * 0.9) / roundTo) * roundTo));
    setStep('warmup');
  };

  const handleSave = async () => {
    if (!selectedLift || !attemptResult || planned <= 0) return;

    setSaving(true);
    try {
      await supabase.from('workout_sessions').insert({
        user_id: user.id,
        lift_type: selectedLift,
        cycle: profile.current_cycle,
        week: profile.current_week,
        weight_lifted: planned,
        reps_performed: attemptResult === 'success' ? 1 : 0,
        calculated_1rm: attemptResult === 'success' ? planned : 0,
        is_1rm_test: true,
        notes: notes.trim() || null,
        completed_at: new Date().toISOString(),
      });

      // On a successful PR: store the actual lift as the tested max and
      // recalculate the training max (tested × 0.90), rounded to nearest plate increment.
      if (attemptResult === 'success' && planned > currentMax) {
        const newTM = Math.round((planned * 0.9) / roundTo) * roundTo;
        await supabase
          .from('user_profiles')
          .update({
            [`${selectedLift}_tested_max`]: planned,
            [`${selectedLift}_max`]: newTM,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        await refreshProfile();
      }

      setStep('complete');
    } catch (error) {
      console.error('Error saving 1RM attempt:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogAnother = () => {
    const nextDefault = attemptResult === 'success' ? planned : currentMax;
    setPlannedAttempt(String(nextDefault));
    setWarmupFeel(null);
    setApproachFeel(null);
    setAttemptResult(null);
    setNotes('');
    setStep('warmup');
  };

  const handleClose = () => {
    setStep('select');
    setSelectedLift(null);
    setPlannedAttempt('');
    setWarmupFeel(null);
    setApproachFeel(null);
    setAttemptResult(null);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/75 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Meet Day — 1RM Attempts</h2>
          </div>
          <IconButton label="Close" onClick={handleClose}>
            &times;
          </IconButton>
        </div>

        <div className="p-6 space-y-6">
          {step === 'select' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Select a lift to start your meet day attempt protocol.
              </p>
              <div className="space-y-3">
                {LIFTS.map(lift => {
                  const tested = profile[lift.testedMaxKey] ?? 0;
                  const tm = profile[lift.maxKey];
                  return (
                    <Tile
                      key={lift.type}
                      onClick={() => handleSelectLift(lift.type)}
                      title={lift.name}
                      description={tested > 0 ? `Best: ${tested} ${unit} · TM: ${tm} ${unit}` : `TM: ${tm} ${unit}`}
                      trailing={<span className="text-blue-600 dark:text-blue-400 font-semibold text-sm flex-shrink-0">Select →</span>}
                      className="bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600"
                    />
                  );
                })}
              </div>
            </>
          )}

          {step === 'warmup' && selectedLift && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {LIFTS.find(l => l.type === selectedLift)!.name}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setStep('select')}>← Back</Button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setPlannedAttempt(String(suggestedOpening))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      plannedAttempt === String(suggestedOpening)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-500 hover:border-blue-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">Opening (90%)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {suggestedOpening} {unit}
                    </p>
                  </button>
                  <button
                    onClick={() => setPlannedAttempt(String(suggestedSecond))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      plannedAttempt === String(suggestedSecond)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-500 hover:border-blue-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">Second (95%)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {suggestedSecond} {unit}
                    </p>
                  </button>
                </div>
                <Input
                  label={`Planned attempt (${unit})`}
                  type="number"
                  value={plannedAttempt}
                  onChange={e => setPlannedAttempt(e.target.value)}
                />
              </div>

              {warmup && (
                <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-500 p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">
                    Warm-up to {planned} {unit}
                  </h3>
                  {warmup.fixedSets.map((set, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 px-3 bg-gray-50 dark:bg-gray-600 rounded-lg text-sm">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {set.percentage === 0 ? 'Bar' : `${set.percentage}%`}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 font-bold">
                        {set.weight} {unit} × {set.reps}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {warmup && !warmupFeel && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">How did the 82% set feel?</p>
                  <div className="flex gap-2">
                    {(['easy', 'good', 'bad'] as WarmupFeel[]).map(feel => (
                      <Button
                        key={feel}
                        variant="tertiary"
                        size="sm"
                        onClick={() => setWarmupFeel(feel)}
                        className="flex-1 py-2.5 capitalize"
                      >
                        {feel.charAt(0).toUpperCase() + feel.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {warmupFeel && approachWeight && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Approach Single</p>
                    <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                      {approachWeight} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unit} × 1</span>
                    </p>
                  </div>

                  {!approachFeel && (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-300">How did the approach feel?</p>
                      <div className="flex gap-2">
                        {(['easy', 'good', 'bad'] as WarmupFeel[]).map(feel => (
                          <Button
                            key={feel}
                            variant="tertiary"
                            size="sm"
                            onClick={() => setApproachFeel(feel)}
                            className="flex-1 py-2.5 capitalize"
                          >
                            {feel.charAt(0).toUpperCase() + feel.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}

                  {approachFeel && adjustedAttempt !== null && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Suggested Opener</p>
                      <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                        {adjustedAttempt} <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{unit}</span>
                      </p>
                      {adjustedAttempt !== planned && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          {adjustedAttempt > planned ? '+' : ''}{adjustedAttempt - planned} {unit} from planned — adjust your opener if needed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                fullWidth
                onClick={() => setStep('attempt')}
                disabled={!plannedAttempt || planned <= 0}
              >
                Ready to attempt {planned > 0 ? `${planned} ${unit}` : ''}
              </Button>
            </>
          )}

          {step === 'attempt' && selectedLift && (
            <>
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {LIFTS.find(l => l.type === selectedLift)!.name} — Attempting
                </p>
                <p className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                  {planned}
                </p>
                <p className="text-lg text-gray-500 dark:text-gray-400">{unit}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="md"
                  onClick={() => setAttemptResult('success')}
                  className={`flex-1 py-5 text-lg ${
                    attemptResult === 'success'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200'
                  }`}
                >
                  Made it
                </Button>
                <Button
                  size="md"
                  onClick={() => setAttemptResult('fail')}
                  className={`flex-1 py-5 text-lg ${
                    attemptResult === 'fail'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200'
                  }`}
                >
                  Missed
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="How did it feel? What broke down?"
                  className="w-full border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => setStep('warmup')}
                >
                  Back
                </Button>
                <Button
                  size="md"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={!attemptResult || saving}
                >
                  {saving ? 'Saving...' : 'Save attempt'}
                </Button>
              </div>
            </>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-6 py-4">
              <div>
                <p className="text-4xl mb-3">{attemptResult === 'success' ? '🏆' : '💪'}</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {attemptResult === 'success' ? 'Attempt successful!' : 'Attempt logged'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {planned} {unit} — {attemptResult === 'success' ? 'lift made' : 'missed'}
                </p>
                {attemptResult === 'success' && planned > currentMax && (
                  <p className="text-green-600 dark:text-green-400 font-semibold mt-2">
                    New personal best! TM updated to {Math.round((planned * 0.9) / roundTo) * roundTo} {unit}.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  fullWidth
                  onClick={handleLogAnother}
                >
                  Log another attempt
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => { onComplete(); handleClose(); }}
                >
                  Done for today
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
