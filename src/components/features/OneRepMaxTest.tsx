import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateWarmupSets, WarmupFeel } from '../../lib/calculations';
import { Activity } from 'lucide-react';

interface OneRepMaxTestProps {
  onClose: () => void;
  onComplete: () => void;
}

type LiftType = 'squat' | 'bench' | 'deadlift';
type Step = 'select' | 'warmup' | 'attempt' | 'complete';

const LIFTS: { name: string; type: LiftType; maxKey: 'squat_max' | 'bench_max' | 'deadlift_max' }[] = [
  { name: 'Squat', type: 'squat', maxKey: 'squat_max' },
  { name: 'Bench Press', type: 'bench', maxKey: 'bench_max' },
  { name: 'Deadlift', type: 'deadlift', maxKey: 'deadlift_max' },
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

  const currentMax = selectedLift
    ? profile[LIFTS.find(l => l.type === selectedLift)!.maxKey]
    : 0;

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
    const max = profile[LIFTS.find(l => l.type === lift)!.maxKey];
    setPlannedAttempt(String(max));
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

      if (attemptResult === 'success' && planned > currentMax) {
        const maxField = `${selectedLift}_max`;
        await supabase
          .from('user_profiles')
          .update({ [maxField]: planned, updated_at: new Date().toISOString() })
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
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 'select' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Select a lift to start your meet day attempt protocol.
              </p>
              <div className="space-y-3">
                {LIFTS.map(lift => (
                  <button
                    key={lift.type}
                    onClick={() => handleSelectLift(lift.type)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{lift.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Current max: {profile[lift.maxKey]} {unit}
                      </p>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">Select →</span>
                  </button>
                ))}
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
                  <button onClick={() => setStep('select')} className="text-xs text-blue-600 dark:text-blue-400">
                    Change lift
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setPlannedAttempt(String(suggestedOpening))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      plannedAttempt === String(suggestedOpening)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
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
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">Second (95%)</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {suggestedSecond} {unit}
                    </p>
                  </button>
                </div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planned attempt ({unit})
                </label>
                <input
                  type="number"
                  value={plannedAttempt}
                  onChange={e => setPlannedAttempt(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {warmup && (
                <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-2">
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
                      <button
                        key={feel}
                        onClick={() => setWarmupFeel(feel)}
                        className="flex-1 py-2.5 rounded-lg font-semibold text-sm capitalize transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {feel.charAt(0).toUpperCase() + feel.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {warmupFeel && approachWeight && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Approach Single</p>
                    <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                      {approachWeight} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{unit} × 1</span>
                    </p>
                  </div>

                  {!approachFeel && (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-300">How did the approach feel?</p>
                      <div className="flex gap-2">
                        {(['easy', 'good', 'bad'] as WarmupFeel[]).map(feel => (
                          <button
                            key={feel}
                            onClick={() => setApproachFeel(feel)}
                            className="flex-1 py-2.5 rounded-lg font-semibold text-sm capitalize transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            {feel.charAt(0).toUpperCase() + feel.slice(1)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {approachFeel && adjustedAttempt !== null && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Suggested Opener</p>
                      <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                        {adjustedAttempt} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{unit}</span>
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

              <button
                onClick={() => setStep('attempt')}
                disabled={!plannedAttempt || planned <= 0}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Ready to attempt {planned > 0 ? `${planned} ${unit}` : ''}
              </button>
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
                <button
                  onClick={() => setAttemptResult('success')}
                  className={`py-5 rounded-xl font-bold text-lg transition-colors ${
                    attemptResult === 'success'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                  }`}
                >
                  Made it
                </button>
                <button
                  onClick={() => setAttemptResult('fail')}
                  className={`py-5 rounded-xl font-bold text-lg transition-colors ${
                    attemptResult === 'fail'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                  }`}
                >
                  Missed
                </button>
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
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('warmup')}
                  className="flex-1 py-3 rounded-xl font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={!attemptResult || saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save attempt'}
                </button>
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
                    New personal best! Training max updated.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogAnother}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Log another attempt
                </button>
                <button
                  onClick={() => { onComplete(); handleClose(); }}
                  className="w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Done for today
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
