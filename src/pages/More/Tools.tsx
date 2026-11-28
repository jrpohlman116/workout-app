import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BAR_WEIGHTS, calculateWarmupSets } from '../../lib/calculations';
import { availablePlates } from '../../lib/plates';
import { trainingMaxFor } from '../../lib/programs/maxes';
import { liftNames } from '../../lib/exercises';
import { meetAttempts, percentageChart } from '../../lib/tools';
import { platesPerSide } from '../../lib/today/plan';
import type { LiftId } from '../../lib/programs/types';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import RadioCards from '../../components/ui/RadioCards';

const LIFTS: LiftId[] = ['squat', 'bench', 'deadlift', 'ohp'];

function LiftPicker({ value, onChange, lifts }: { value: LiftId; onChange: (l: LiftId) => void; lifts: LiftId[] }) {
  return (
    <RadioCards<LiftId>
      layout="segmented"
      ariaLabel="Lift"
      value={value}
      onSelect={onChange}
      options={lifts.map(l => ({ value: l, title: l === 'ohp' ? 'OHP' : (liftNames[l] ?? l).replace(' Press', '') }))}
    />
  );
}

/** Warm-up sets up to any working weight, from the same per-lift ramps Today uses. */
export function WarmupCalculator() {
  const { profile } = useAuth();
  const unit = profile?.unit_preference || 'lb';
  const [lift, setLift] = useState<LiftId>('squat');
  const [weight, setWeight] = useState('');
  const top = parseFloat(weight);
  const sets = top > 0 ? calculateWarmupSets(top, unit, lift).fixedSets : [];
  const bar = BAR_WEIGHTS[unit] ?? 45;
  const plates = availablePlates(profile);

  return (
    <Card className="p-5 space-y-4">
      <LiftPicker value={lift} onChange={setLift} lifts={LIFTS} />
      <Input label={`Working weight (${unit})`} type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 225" />
      {sets.length > 0 && (
        <ol className="space-y-2">
          {sets.map((s, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.weight} {unit} × {s.reps}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{platesPerSide(s.weight, bar, plates) ?? ''}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">Warm-ups round to the full plate step and never change your working weight.</p>
    </Card>
  );
}

/** Your training max at every 5%, rounded to your plates. */
export function PercentageChart() {
  const { profile } = useAuth();
  const unit = profile?.unit_preference || 'lb';
  const lifts = LIFTS.filter(l => profile && trainingMaxFor(profile, l) > 0);
  const [lift, setLift] = useState<LiftId>(lifts[0] ?? 'squat');
  const tm = profile ? trainingMaxFor(profile, lift) : 0;
  const rows = tm > 0 ? percentageChart(tm, lift, unit, availablePlates(profile)) : [];

  return (
    <Card className="p-5 space-y-4">
      {lifts.length > 1 && <LiftPicker value={lift} onChange={setLift} lifts={lifts} />}
      {tm > 0 ? (
        <table className="w-full text-sm">
          <caption className="text-left text-xs text-gray-500 dark:text-gray-400 mb-2">{liftNames[lift]} training max {tm} {unit}</caption>
          <thead><tr className="text-left text-xs text-gray-500 dark:text-gray-400"><th scope="col" className="py-1">Percent</th><th scope="col" className="py-1 text-right">Weight</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.pct} className="border-t border-gray-100 dark:border-gray-700">
                <td className="py-2 text-gray-600 dark:text-gray-300">{r.pct}%</td>
                <td className="py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{r.weight} {unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-300">Set a training max in More → Program to see your chart.</p>
      )}
    </Card>
  );
}

/** Openers, seconds and thirds from your tested maxes. */
export function AttemptPicker() {
  const { profile } = useAuth();
  const unit = profile?.unit_preference || 'lb';
  const tested: Partial<Record<LiftId, number | null | undefined>> = {
    squat: profile?.squat_tested_max, bench: profile?.bench_tested_max, deadlift: profile?.deadlift_tested_max,
  };
  const [lift, setLift] = useState<LiftId>('squat');
  const [override, setOverride] = useState('');
  const max = parseFloat(override) || tested[lift] || 0;
  const attempts = max > 0 ? meetAttempts(max, lift, unit, availablePlates(profile)) : [];

  return (
    <Card className="p-5 space-y-4">
      <LiftPicker value={lift} onChange={l => { setLift(l); setOverride(''); }} lifts={['squat', 'bench', 'deadlift']} />
      <Input
        label={`1RM to plan from (${unit})`}
        type="number"
        inputMode="decimal"
        value={override}
        onChange={e => setOverride(e.target.value)}
        placeholder={tested[lift] ? `Your tested max: ${tested[lift]}` : 'e.g. 315'}
      />
      {attempts.length > 0 && (
        <ol className="space-y-2">
          {attempts.map(a => (
            <li key={a.label} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.label} · {a.pct}%</span>
                <span className="text-lg font-black tabular-nums text-gray-900 dark:text-gray-100">{a.weight} {unit}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{a.note}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
