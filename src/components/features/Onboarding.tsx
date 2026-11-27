import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { sessionProgramFields } from '../../lib/programs/session';
import { useAuth } from '../../contexts/AuthContext';
import { BAR_WEIGHTS, calculateOneRepMax } from '../../lib/calculations';
import { trainingMaxFromOneRepMax } from '../../lib/programs/maxes';
import { loadIncrement } from '../../lib/programs/shared/rounding';
import { liftNames } from '../../lib/exercises';
import { PLATE_OPTIONS, STARTER_PLATES } from '../../lib/plates';
import { ONBOARDING_PROGRAM, firstWave, programStructure, type RunningDays, type TrainingGoal } from '../../lib/onboarding';
import type { DaysPerWeek, LiftId } from '../../lib/programs/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import RadioCards from '../ui/RadioCards';

// Onboarding (UX handoff, phase 7): goal, meet date, schedule, maxes,
// equipment, how Ironform trains, your first wave. New lifters start on 5/3/1
// (decision 1). Bodyweight and sex moved to More → Account; sticking points
// to Training preferences (empty by default, so accessories use the day's
// defaults until set).

const TOTAL_STEPS = 7;
type MaxLift = 'squat' | 'bench' | 'deadlift' | 'ohp';
type Unit = 'lb' | 'kg';

const IDEAS = [
  { title: '4-week waves', text: 'Each wave builds from volume to heavier work, then an AMRAP test week and a deload.' },
  { title: 'AMRAP week sets your next max', text: 'One all-out top set every fourth week. Hit the minimum reps and your training max goes up.' },
  { title: 'Back-offs end at your first miss', text: 'Keep doing sets until one falls short. No guessing how many.' },
  { title: 'Readiness trims volume, never weight', text: 'Your recent sessions decide how much you do on a tired day, not how heavy. Oura and your runs add to that if you connect them.' },
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<TrainingGoal>('stronger');
  const [meetDate, setMeetDate] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<DaysPerWeek>(3);
  const [running, setRunning] = useState<RunningDays>('0');
  const [maxes, setMaxes] = useState<Record<MaxLift, string>>({ squat: '', bench: '', deadlift: '', ohp: '' });
  const [estimating, setEstimating] = useState<MaxLift | null>(null);
  const [estimate, setEstimate] = useState({ weight: '', reps: '' });
  const [unit, setUnit] = useState<Unit>('lb');
  const [plates, setPlates] = useState<number[]>(STARTER_PLATES.lb);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(''), 1000);
    return () => clearTimeout(timer);
  }, [announcement]);

  const go = (to: number) => {
    setStep(to);
    setAnnouncement(`Step ${to} of ${TOTAL_STEPS}`);
  };

  const hasOhpDay = daysPerWeek === 4;
  const lifts: MaxLift[] = hasOhpDay ? ['squat', 'bench', 'deadlift', 'ohp'] : ['squat', 'bench', 'deadlift'];
  const num = (l: MaxLift) => parseFloat(maxes[l]) || 0;
  const hasAtLeastOneLift = (['squat', 'bench', 'deadlift'] as const).some(l => num(l) > 0);
  const weeksAway = meetDate ? Math.ceil((new Date(meetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)) : null;
  const wave = firstWave({
    days: daysPerWeek,
    oneRepMaxes: Object.fromEntries(lifts.map(l => [l, num(l)])) as Partial<Record<LiftId, number>>,
    unit, plates,
  });

  const switchUnit = (next: Unit) => {
    setUnit(next);
    setPlates(STARTER_PLATES[next]);
  };

  const applyEstimate = (lift: MaxLift) => {
    const w = parseFloat(estimate.weight);
    const r = parseInt(estimate.reps);
    if (!(w > 0) || !(r >= 1) || r > 12) return;
    const value = calculateOneRepMax(w, r);
    setMaxes(m => ({ ...m, [lift]: String(value) }));
    setEstimating(null);
    setEstimate({ weight: '', reps: '' });
    setAnnouncement(`${liftNames[lift]} 1RM set to ${value} ${unit}`);
  };

  const handleSubmit = async () => {
    if (!user || !hasAtLeastOneLift) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload: Record<string, unknown> = {
        unit_preference: unit,
        [unit === 'kg' ? 'available_plates_kg' : 'available_plates_lb']: plates,
        squat_max: trainingMaxFromOneRepMax(num('squat'), 'squat', unit),
        bench_max: trainingMaxFromOneRepMax(num('bench'), 'bench', unit),
        deadlift_max: trainingMaxFromOneRepMax(num('deadlift'), 'deadlift', unit),
        squat_tested_max: num('squat') > 0 ? num('squat') : null,
        bench_tested_max: num('bench') > 0 ? num('bench') : null,
        deadlift_tested_max: num('deadlift') > 0 ? num('deadlift') : null,
        program_id: ONBOARDING_PROGRAM,
        days_per_week: daysPerWeek,
        training_goal: goal,
        running_days_per_week: running,
        program_start_date: today,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      // Overhead press is optional; a max is saved as a pair.
      if (hasOhpDay && num('ohp') > 0) {
        payload.ohp_tested_max = num('ohp');
        payload.ohp_max = trainingMaxFromOneRepMax(num('ohp'), 'ohp', unit);
      }
      if (meetDate && weeksAway && weeksAway > 0) payload.meet_date = meetDate;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles').update(payload).eq('id', user.id).select().single();
      if (profileError) throw profileError;

      // Each entered 1RM is logged as a 1-rep session at that weight.
      const inserts = (['squat', 'bench', 'deadlift'] as const)
        .filter(l => num(l) > 0)
        .map(l => ({
          user_id: user.id, lift_type: l, cycle: 0, week: 0,
          weight_lifted: num(l), reps_performed: 1, calculated_1rm: num(l),
          completed_at: profile.created_at,
          ...sessionProgramFields(profile, l),
        }));
      if (inserts.length) {
        const { error: sessionError } = await supabase.from('workout_sessions').insert(inserts);
        if (sessionError) throw sessionError;
      }
      setAnnouncement('Your program is ready');
      await refreshProfile();
    } catch (err) {
      console.error('Error finishing onboarding:', err);
      setError("Couldn't save your program. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const heading = (title: string, text: string) => (
    <>
      <legend className="text-h3 text-gray-900 dark:text-white mb-1">{title}</legend>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{text}</p>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400">Ironform</p>
          <h1 className="text-h1 text-gray-900 dark:text-white">Build your program</h1>
        </div>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

        {/* The per-step name label was removed on purpose: just the count and the bar. */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Step {step} of {TOTAL_STEPS}</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
            <div className="bg-gray-900 dark:bg-gray-100 h-1 rounded-full transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-6">
          {step === 1 && (
            <fieldset>
              {heading('What are you training for?', 'This sets your defaults. You can change it any time in More.')}
              <RadioCards<TrainingGoal>
                ariaLabel="Training goal"
                value={goal}
                onSelect={setGoal}
                options={[
                  { value: 'compete', title: 'Compete in powerlifting', description: 'Peak for a meet with a taper, countdown and attempt planning' },
                  { value: 'stronger', title: 'Get stronger', description: 'Build squat, bench and deadlift with no meet on the calendar' },
                  { value: 'lift_and_run', title: 'Lift and run', description: 'Strength training that adjusts around your running' },
                ]}
              />
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              {heading("When's your next meet?", 'Optional. With a date, Ironform plans a peak so your heaviest week lands right before it, and shows a countdown on Home.')}
              <Input id="meet-date" label="Meet date" type="date" value={meetDate} min={new Date().toISOString().split('T')[0]} onChange={e => setMeetDate(e.target.value)} />
              {weeksAway != null && (
                <p className={`mt-2 text-sm ${weeksAway > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-amber-700 dark:text-amber-400'}`}>
                  {weeksAway > 0 ? `${weeksAway} ${weeksAway === 1 ? 'week' : 'weeks'} away` : 'Pick a date in the future.'}
                </p>
              )}
              {weeksAway != null && weeksAway > 0 && (
                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Program structure</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{programStructure(weeksAway)}</p>
                </div>
              )}
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="space-y-5">
              {heading('How often can you train?', 'Pick the days you can lift. Running days help Ironform plan around your runs.')}
              <div>
                <h2 id="days-label" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Lifting days per week</h2>
                <RadioCards<DaysPerWeek>
                  labelId="days-label"
                  value={daysPerWeek}
                  onSelect={setDaysPerWeek}
                  options={[
                    { value: 3, title: '3 days · Recommended', description: 'squat, bench, deadlift' },
                    { value: 4, title: '4 days', description: 'squat, overhead press, deadlift, bench' },
                  ]}
                />
              </div>
              <div>
                <h2 id="running-label" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Running days per week</h2>
                <RadioCards<RunningDays>
                  layout="segmented"
                  labelId="running-label"
                  value={running}
                  onSelect={setRunning}
                  options={[{ value: '0', title: 'None' }, { value: '1-2', title: '1–2 days' }, { value: '3+', title: '3+ days' }]}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Ironform keeps hard runs at least a day away from squat and deadlift days.</p>
              </div>
            </fieldset>
          )}

          {step === 4 && (
            <fieldset className="space-y-4">
              {heading('Enter your maxes', 'Your best recent 1RM for each lift. Not sure? Estimate it from a recent hard set.')}
              {lifts.map(lift => (
                <div key={lift} className="space-y-2">
                  <Input
                    id={`${lift}-max`}
                    label={`${lift === 'ohp' ? 'Overhead press (optional)' : liftNames[lift]} 1RM (${unit})`}
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={maxes[lift]}
                    onChange={e => setMaxes(m => ({ ...m, [lift]: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => { setEstimating(estimating === lift ? null : lift); setEstimate({ weight: '', reps: '' }); }}
                    aria-expanded={estimating === lift}
                    aria-controls={`${lift}-estimate`}
                    className="min-h-[44px] rounded-lg bg-gray-100 dark:bg-gray-700 px-3 text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {estimating === lift ? 'Close' : 'Estimate from a set'}
                  </button>
                  {estimating === lift && (
                    <div id={`${lift}-estimate`} className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3 space-y-3" role="group" aria-label={`Estimate your ${liftNames[lift]} 1RM`}>
                      <div className="grid grid-cols-2 gap-3">
                        <Input id={`${lift}-est-weight`} label={`Weight (${unit})`} type="number" inputMode="decimal" value={estimate.weight} onChange={e => setEstimate(s => ({ ...s, weight: e.target.value }))} />
                        <Input id={`${lift}-est-reps`} label="Reps" type="number" inputMode="numeric" value={estimate.reps} onChange={e => setEstimate(s => ({ ...s, reps: e.target.value }))} />
                      </div>
                      {parseInt(estimate.reps) > 12 && <p className="text-xs text-amber-700 dark:text-amber-400">Use a set of 12 reps or fewer for a useful estimate.</p>}
                      <Button type="button" fullWidth size="sm" onClick={() => applyEstimate(lift)} disabled={!(parseFloat(estimate.weight) > 0) || !(parseInt(estimate.reps) >= 1) || parseInt(estimate.reps) > 12}>
                        {parseFloat(estimate.weight) > 0 && parseInt(estimate.reps) >= 1 && parseInt(estimate.reps) <= 12
                          ? `Use ${calculateOneRepMax(parseFloat(estimate.weight), parseInt(estimate.reps))} ${unit}`
                          : 'Use this estimate'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500 dark:text-gray-400">Your training max is 90% of each number. That's what the program builds from.</p>
              {!hasAtLeastOneLift && <p className="text-sm text-amber-700 dark:text-amber-400">Enter at least one of squat, bench or deadlift to continue.</p>}
            </fieldset>
          )}

          {step === 5 && (
            <fieldset className="space-y-5">
              {heading('What are you lifting with?', 'So every weight Ironform prescribes is one you can actually load.')}
              <div>
                <h2 id="unit-label" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Units</h2>
                <RadioCards<Unit>
                  labelId="unit-label"
                  value={unit}
                  onSelect={switchUnit}
                  options={[
                    { value: 'lb', title: 'Pounds (lb)', description: 'Plates in pounds' },
                    { value: 'kg', title: 'Kilograms (kg)', description: 'Plates in kilograms' },
                  ]}
                />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">Bar weight: <span className="font-semibold">{BAR_WEIGHTS[unit]} {unit}</span></p>
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Plates you have</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`Plates in ${unit}`}>
                  {PLATE_OPTIONS[unit].map(p => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={plates.includes(p)}
                      onClick={() => setPlates(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a, b) => b - a)))}
                      className={`min-h-[44px] min-w-[56px] rounded-xl px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${plates.includes(p) ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
                    >
                      {p} {unit}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Loads round to {loadIncrement('squat', unit, plates)} {unit} on squat and deadlift and {loadIncrement('bench', unit, plates)} {unit} on bench and overhead press.
                </p>
              </div>
            </fieldset>
          )}

          {step === 6 && (
            <fieldset>
              {heading('How Ironform trains', 'No sign-up questions here. Just the four ideas behind every session.')}
              <ol className="space-y-4">
                {IDEAS.map((idea, i) => (
                  <li key={idea.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-xs font-semibold text-white dark:text-gray-900" aria-hidden="true">{i + 1}</span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{idea.title}</span>
                      <span className="block text-sm text-gray-600 dark:text-gray-300">{idea.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </fieldset>
          )}

          {step === 7 && (
            <fieldset>
              {heading('Your first wave', 'Week 1 loads from your maxes. Every number is loadable with your plates.')}
              <ul className="space-y-3">
                {wave.map(w => (
                  <li key={w.lift} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{liftNames[w.lift]}</h2>
                      <span className="text-xs text-gray-400">Training max {w.trainingMax} {unit}</span>
                    </div>
                    <dl className="mt-1 space-y-0.5 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Top set</dt><dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{w.top.weight} {unit} × {w.top.reps}</dd></div>
                      {w.backoff && <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Back-offs</dt><dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{w.backoff.weight} {unit} × {w.backoff.reps}</dd></div>}
                    </dl>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Readiness starts from your training. Connecting Oura or Strava to add sleep, HRV and runs is coming in a later update.</p>
            </fieldset>
          )}

          {error && <p className="text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>}

          <div className="flex gap-3">
            {step > 1 && <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => go(step - 1)}>Back</Button>}
            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={() => go(step + 1)}
                disabled={(step === 4 && !hasAtLeastOneLift) || (step === 5 && plates.length === 0)}
              >
                Next
              </Button>
            ) : (
              <Button type="button" size="lg" className="flex-1" onClick={handleSubmit} disabled={loading || !hasAtLeastOneLift} aria-busy={loading}>
                {loading ? 'Setting up…' : 'Start week 1'}
              </Button>
            )}
          </div>
          {step === 2 && !meetDate && (
            <Button type="button" variant="ghost" fullWidth onClick={() => go(3)}>Skip for now</Button>
          )}
        </div>
      </div>
    </div>
  );
}
