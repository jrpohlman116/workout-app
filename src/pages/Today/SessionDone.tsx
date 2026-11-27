import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { backoffResult, tmDelta, tmSteps } from '../../lib/today/summary';
import { summarizeSets } from '../../lib/today/accessories';
import type { LiftId, TmUpdate, Unit } from '../../lib/programs/types';
import type { LoggedSet, TodaySession } from '../../lib/today/session';
import type { PlanAccessory } from '../../lib/today/plan';
import type { ReadinessState } from '../../lib/readiness/types';

interface SessionDoneProps {
  userId: string;
  sessionId: string;
  lift: LiftId;
  liftName: string;
  eyebrow: string;
  unit: Unit;
  session: TodaySession;
  planned: { top: { weight: number; reps: number } | null; backoffTarget: number; backoffWeight: number | null };
  accessories: (PlanAccessory & { shownName: string })[];
  readiness: ReadinessState;
  /** "Back-off load stays at 115 lb" and why. */
  backoffNext: { title: string; detail: string } | null;
  /** "Top set: 85% of 147.5 lb" for the next session of this lift. */
  topNext: { title: string; detail: string } | null;
  tmUpdate: (TmUpdate & { previousTm: number; applied: boolean }) | null;
  /** Next wave, week 1, at the new training max. */
  nextWave: { top: string; backoff: string } | null;
  onRetryTm: () => Promise<void>;
  onOpenHistory: () => void;
  onDone: () => void;
}

const STATE = { green: 'Green', yellow: 'Yellow', red: 'Red' } as const;

/** Session summary (proposal #7), then wave complete after a week 3 AMRAP (proposal #5). */
export default function SessionDone(props: SessionDoneProps) {
  const { userId, sessionId, lift, liftName, eyebrow, unit, session, planned, accessories, readiness, tmUpdate } = props;
  const [showWave, setShowWave] = useState(false);
  const [last, setLast] = useState<{ full: number; dropOffAt: number | null } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const lower = liftName.toLowerCase();

  // The last session of this lift before today's, for "Compared with last time".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('main_sets_data')
        .eq('user_id', userId)
        .eq('lift_type', lift)
        .neq('id', sessionId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data?.main_sets_data) return;
      const sets = (data.main_sets_data as { reps: string; kind?: string; checked?: boolean }[]).filter(s => s.checked !== false);
      const tagged = sets.some(s => s.kind);
      const backoffs: LoggedSet[] = (tagged ? sets.filter(s => s.kind === 'backoff') : sets.slice(1)).map(s => ({ weight: 0, reps: parseInt(s.reps) || 0 }));
      setLast(backoffResult(backoffs, planned.backoffTarget));
    })();
    return () => { cancelled = true; };
  }, [userId, lift, sessionId, planned.backoffTarget]);

  const today = backoffResult(session.backoffs, planned.backoffTarget);
  const top = session.top;

  if (showWave && tmUpdate) {
    const steps = top ? tmSteps({ liftName, lift, unit, previousTm: tmUpdate.previousTm, amrap: top, update: tmUpdate }) : [];
    return (
      <div className="min-h-screen pb-24">
        <Header eyebrow={`${liftName} · ${eyebrow}`} title="Wave complete" />
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="text-h4 text-gray-900 dark:text-gray-100">New {lower} training max</h2>
            <p className="flex items-baseline gap-3">
              <span className="text-5xl font-black tabular-nums text-gray-900 dark:text-gray-100">{tmUpdate.newTm}</span>
              <span className="text-2xl font-semibold text-gray-400">{unit}</span>
              <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">
                {tmDelta(tmUpdate.previousTm, tmUpdate.newTm, unit)}
              </span>
            </p>
            <button type="button" onClick={props.onOpenHistory} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              {liftName} training max history <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">How we got there</h3>
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-xs font-semibold text-gray-900 dark:text-gray-100" aria-hidden="true">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
          {props.nextWave && (
            <Card className="p-5 space-y-2">
              <h2 className="text-h4 text-gray-900 dark:text-gray-100">Next wave, week 1</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Top set (75%)</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{props.nextWave.top}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600 dark:text-gray-300">Back-offs (67.5%)</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{props.nextWave.backoff}</dd></div>
              </dl>
              <p className="text-xs text-gray-500 dark:text-gray-400">It starts after this wave's deload week.</p>
            </Card>
          )}
          <Button fullWidth size="lg" onClick={props.onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header eyebrow={`${liftName} · ${eyebrow}`} title="Session done" />
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {top && (
            <Card className="p-4">
              <h2 className="text-xs text-gray-500 dark:text-gray-400">Top set</h2>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">{top.weight} <span className="text-sm font-semibold text-gray-400">{unit}</span></p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                × {top.reps}{planned.top && top.weight === planned.top.weight && top.reps === planned.top.reps ? ' · as planned' : ''}
              </p>
            </Card>
          )}
          {planned.backoffWeight != null && (
            <Card className="p-4">
              <h2 className="text-xs text-gray-500 dark:text-gray-400">Back-offs</h2>
              <p className="text-2xl font-black text-gray-900 dark:text-gray-100 tabular-nums">{today.full} <span className="text-sm font-semibold text-gray-400">{today.full === 1 ? 'set' : 'sets'}</span></p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{planned.backoffWeight} {unit} × {planned.backoffTarget}</p>
            </Card>
          )}
        </div>

        <Card className="p-5 space-y-2">
          <h2 className="text-h4 text-gray-900 dark:text-gray-100">Compared with last {lower} day</h2>
          <dl className="space-y-1 text-sm">
            {planned.backoffWeight != null && (
              <>
                <Row label="Back-off sets" value={`${today.full}${last ? ` (was ${last.full})` : ''}`} />
                <Row label="Drop-off" value={`${today.dropOffAt ? `Set ${today.dropOffAt}` : 'None'}${last ? ` (was ${last.dropOffAt ? `set ${last.dropOffAt}` : 'none'})` : ''}`} />
              </>
            )}
            <Row label="Readiness" value={`${STATE[readiness]} · ${session.time === 60 ? '60+' : session.time} min session`} />
          </dl>
          {!last && <p className="text-xs text-gray-500 dark:text-gray-400">No earlier {lower} day to compare with yet.</p>}
        </Card>

        {(props.backoffNext || props.topNext) && (
          <Card className="p-5 space-y-3">
            <h2 className="text-h4 text-gray-900 dark:text-gray-100">What changes next {lower} day</h2>
            {[props.backoffNext, props.topNext].filter(Boolean).map(item => (
              <div key={item!.title} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item!.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item!.detail}</p>
              </div>
            ))}
          </Card>
        )}

        {accessories.length > 0 && (
          <Card className="p-5 space-y-2">
            <h2 className="text-h4 text-gray-900 dark:text-gray-100">Accessories</h2>
            <ul className="space-y-2">
              {accessories.map((a, i) => {
                const sets = session.accessories[i] ?? [];
                const status = sets.length ? 'Done' : a.cut && !session.restored.includes(i) ? 'Cut' : 'Skipped';
                return (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-900 dark:text-gray-100">{a.shownName}{sets.length ? ` · ${summarizeSets(sets, unit)}` : ''}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${status === 'Done' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{status}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {tmUpdate && !tmUpdate.applied && (
          <Card className="p-5 space-y-2" >
            <p className="text-sm text-gray-900 dark:text-gray-100" role="alert">Your session is saved, but the new training max ({tmUpdate.newTm} {unit}) didn't save.</p>
            {retryError && <p className="text-sm text-red-600 dark:text-red-400">Still couldn't save it. Check your connection and try again.</p>}
            <Button fullWidth variant="ghost" disabled={retrying} onClick={async () => {
              setRetrying(true);
              setRetryError(false);
              try { await props.onRetryTm(); } catch { setRetryError(true); } finally { setRetrying(false); }
            }}>
              {retrying ? 'Saving…' : 'Try again'}
            </Button>
          </Card>
        )}

        <Button fullWidth size="lg" onClick={() => (tmUpdate?.applied ? setShowWave(true) : props.onDone())}>
          {tmUpdate?.applied ? 'See your new training max' : 'Done'}
        </Button>
      </div>
    </div>
  );
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4">
      <div className="max-w-md mx-auto">
        <p className="text-xs font-semibold text-gray-400 tracking-wide">{eyebrow}</p>
        <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 leading-tight">{title}</h1>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
      <dd className="font-semibold text-gray-900 dark:text-gray-100 text-right">{value}</dd>
    </div>
  );
}
