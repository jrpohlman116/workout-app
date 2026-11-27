import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BAR_WEIGHTS } from '../../lib/calculations';
import { availablePlates, PLATE_OPTIONS } from '../../lib/plates';
import { loadIncrement } from '../../lib/programs/shared/rounding';
import { REST_TIMER_DEFAULTS } from '../../lib/constants';
import { readWarmupDisplay, saveWarmupDisplay } from '../../lib/today/prefs';
import { formatRest } from '../../hooks/useActiveSession';
import { connect, disconnect, loadIntegrations, type Integration, type Provider } from '../../lib/integrations';
import { HARD_RUN_AVG_HR, HARD_RUN_MINUTES, HRV_DROP } from '../../lib/readiness/wearable';
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
  const { user, profile } = useAuth();
  const [warmups, setWarmups] = useState<WarmupDisplay>(() => readWarmupDisplay(profile));
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
          onSelect={v => { setWarmups(v); saveWarmupDisplay(v, user?.id); }}
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

const PROVIDER_INFO: Record<Provider, { name: string; detail: string }> = {
  oura: { name: 'Oura', detail: 'HRV, sleep and readiness' },
  strava: { name: 'Strava', detail: 'Runs, including your Garmin runs' },
};

/** Integrations (proposal #13): Oura and Strava, through cloud APIs only. */
export function IntegrationsSettings() {
  const { user } = useAuth();
  const [list, setList] = useState<Integration[] | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [message, setMessage] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    if (connected === 'oura' || connected === 'strava') return `${PROVIDER_INFO[connected].name} is connected.`;
    return params.get('error') ? "Couldn't finish connecting. Try again." : null;
  });

  useEffect(() => {
    if (!user) return;
    loadIntegrations(user.id).then(setList).catch(() => setList([]));
  }, [user]);

  const statusOf = (p: Provider) => list?.find(i => i.provider === p);
  const act = async (p: Provider, connected: boolean) => {
    setBusy(p);
    setMessage(null);
    try {
      if (connected) {
        await disconnect(p);
        if (user) setList(await loadIntegrations(user.id));
        setMessage(`${PROVIDER_INFO[p].name} is disconnected.`);
      } else {
        await connect(p); // leaves the page for the provider's consent screen
      }
    } catch {
      setMessage(connected ? "Couldn't disconnect. Try again." : "Couldn't start connecting. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Readiness starts from your logged sessions. These add sleep, HRV and runs. It never changes your weights.
        </p>
        <ul className="space-y-2">
          {(['oura', 'strava'] as Provider[]).map(p => {
            const s = statusOf(p);
            const connected = !!s && s.status !== 'disconnected';
            const synced = s?.last_synced_at ? new Date(s.last_synced_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
            return (
              <li key={p} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{PROVIDER_INFO[p].name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {PROVIDER_INFO[p].detail}{connected && synced ? ` · synced ${synced}` : ''}{s?.status === 'error' ? ' · sync failed' : ''}
                  </span>
                </span>
                {connected && <span className="text-xs font-semibold text-green-800 dark:text-green-300">Connected</span>}
                <Button size="sm" variant={connected ? 'tertiary' : 'primary'} disabled={busy !== null || list === null} onClick={() => act(p, connected)}>
                  {busy === p ? '…' : connected ? 'Disconnect' : 'Connect'}
                </Button>
              </li>
            );
          })}
        </ul>
        {message && <p className="text-sm text-gray-700 dark:text-gray-300" role="status">{message}</p>}
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="text-h4 text-gray-900 dark:text-gray-100">Readiness thresholds</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Yellow when HRV drops</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{HRV_DROP * 100}% below baseline</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Hard run</dt><dd className="font-semibold text-gray-900 dark:text-gray-100 text-right">Avg HR above {HARD_RUN_AVG_HR} or {HARD_RUN_MINUTES}+ min</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Red after</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">2 yellow days in a row</dd></div>
        </dl>
        <p className="text-xs text-gray-500 dark:text-gray-400">These are starting points. Ironform logs every time you override readiness so the thresholds can be tuned.</p>
      </Card>
    </div>
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
