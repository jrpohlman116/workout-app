import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BAR_WEIGHTS } from '../../lib/calculations';
import { availablePlates } from '../../lib/plates';
import { loadIncrement } from '../../lib/programs/shared/rounding';
import { REST_TIMER_DEFAULTS } from '../../lib/constants';
import { readWarmupDisplay, saveWarmupDisplay } from '../../lib/today/prefs';
import { formatRest } from '../../hooks/useActiveSession';
import { useFormState } from '../../hooks/useFormState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import RadioCards from '../../components/ui/RadioCards';
import SaveFeedback from '../../components/ui/SaveFeedback';
import MaxesTab from '../Profile/tabs/MaxesTab';
import TrainingTab from '../Profile/tabs/TrainingTab';
import BodyStatsTab from '../Profile/tabs/BodyStatsTab';
import SecurityTab from '../Profile/tabs/SecurityTab';

/** Program: training maxes, program, days per week, meet date, split and sticking points. */
export function ProgramSettings() {
  return (
    <div className="space-y-4">
      <TrainingTab />
      <MaxesTab />
    </div>
  );
}

type WarmupDisplay = 'collapsed' | 'open' | 'off';

/** Training preferences (proposal #13): warm-up display, rest timers, sticking points. */
export function TrainingPreferences({ onEditStickingPoints }: { onEditStickingPoints: () => void }) {
  const [warmups, setWarmups] = useState<WarmupDisplay>(readWarmupDisplay);
  const rests = [
    { label: 'Warm-up sets', seconds: REST_TIMER_DEFAULTS.warmup },
    { label: 'Top set and back-offs', seconds: REST_TIMER_DEFAULTS.main },
    { label: 'Accessories', seconds: REST_TIMER_DEFAULTS.accessory },
  ];
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h2 id="warmup-pref" className="text-h4 text-gray-900 dark:text-gray-100">Warm-ups</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">A ramp to your top set, built from that day's weight. Logging it is optional.</p>
        <RadioCards<WarmupDisplay>
          labelId="warmup-pref"
          value={warmups}
          onSelect={v => { setWarmups(v); saveWarmupDisplay(v); }}
          options={[
            { value: 'collapsed', title: 'Collapsed above the top set', description: 'Default. One tap opens the sets.' },
            { value: 'open', title: 'Open above the top set', description: 'Sets are listed and ready to log.' },
            { value: 'off', title: 'Off', description: 'Start at the top set and warm up your own way.' },
          ]}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-h4 text-gray-900 dark:text-gray-100">Rest timers</h2>
        <dl className="space-y-2 text-sm">
          {rests.map(r => (
            <div key={r.label} className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-300">{r.label}</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatRest(r.seconds)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-gray-500 dark:text-gray-400">Rest ends with a sound and vibration. You can add 30 seconds or skip from the timer.</p>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="text-h4 text-gray-900 dark:text-gray-100">Accessories and sticking points</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Pick the sticking point for each lift so Ironform chooses accessories that target it. Swaps you make in a session last for that day only.
        </p>
        <button type="button" onClick={onEditStickingPoints} className="min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          Edit sticking points
        </button>
      </Card>
    </div>
  );
}

const PLATE_OPTIONS = { lb: [55, 45, 35, 25, 15, 10, 5, 2.5, 1.25], kg: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5] } as const;

/** Equipment: the plates you have, which decide how loads round. */
export function EquipmentSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const unit = (profile?.unit_preference === 'kg' ? 'kg' : 'lb') as 'lb' | 'kg';
  const [plates, setPlates] = useState<number[]>(() => availablePlates(profile));
  const { loading, error, saved, run, markUnsaved } = useFormState();
  const toggle = (p: number) => {
    setPlates(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a, b) => b - a)));
    markUnsaved();
  };
  const save = () => user && run(async () => {
    const { error } = await supabase.from('user_profiles')
      .update({ [unit === 'kg' ? 'available_plates_kg' : 'available_plates_lb']: plates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
    await refreshProfile();
  }, "Couldn't save your plates. Try again.");

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h2 className="text-h4 text-gray-900 dark:text-gray-100">Plates</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Pick the plates you have, per side. Loads round to what you can put on the bar.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Plates in ${unit}`}>
          {PLATE_OPTIONS[unit].map(p => (
            <button
              key={p}
              type="button"
              aria-pressed={plates.includes(p)}
              onClick={() => toggle(p)}
              className={`min-h-[44px] min-w-[56px] rounded-xl px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${plates.includes(p) ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <dl className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Bar</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{BAR_WEIGHTS[unit]} {unit}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Squat and deadlift round to</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{loadIncrement('squat', unit, plates)} {unit}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Bench and overhead press round to</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{loadIncrement('bench', unit, plates)} {unit}</dd></div>
        </dl>
        <Button fullWidth onClick={save} disabled={loading || plates.length === 0}>{loading ? 'Saving…' : 'Save plates'}</Button>
        <SaveFeedback error={error} saved={saved} savedMessage="Plates saved." />
      </Card>
      <p className="px-1 text-xs text-white/80">Units are set with your body stats in More → Account.</p>
    </div>
  );
}

export function IntegrationsSettings() {
  return (
    <Card className="p-5 space-y-2">
      <h2 className="text-h4 text-gray-900 dark:text-gray-100">Oura and Strava</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Connecting a wearable adds sleep, HRV and runs to your readiness. It's coming in a later update. Until then, readiness comes from your last sessions.
      </p>
    </Card>
  );
}

export function AppSettings() {
  return <SecurityTab sections="app" />;
}

/** Account: body stats (bodyweight and sex for DOTS, units), password, sign out and deletion. */
export function AccountSettings() {
  return (
    <div className="space-y-4">
      <BodyStatsTab />
      <SecurityTab sections="account" />
    </div>
  );
}
