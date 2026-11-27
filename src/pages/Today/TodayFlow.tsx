import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProgramContext } from '../../hooks/useProgramContext';
import { useTodayReadiness } from '../../hooks/useTodayReadiness';
import { useDayAccessories } from '../../hooks/useDayAccessories';
import { useWakeLock } from '../../hooks/useWakeLock';
import { trainingMaxFor } from '../../lib/programs/maxes';
import { loadIncrement } from '../../lib/programs/shared/rounding';
import { WAVE_ORDER } from '../../lib/programs/fiveThreeOne/engine';
import { EMPTY_BACKOFF_STATE, nextBackoffState, type BackoffLiftState } from '../../lib/programs/backoffs';
import type { LiftId, Unit } from '../../lib/programs/types';
import { BAR_WEIGHTS } from '../../lib/calculations';
import { availablePlates } from '../../lib/plates';
import { REST_TIMER_DEFAULTS } from '../../lib/constants';
import { liftNames } from '../../lib/exercises';
import { sessionLimits } from '../../lib/readiness/effects';
import { buildTodayPlan, explainWeight, platesPerSide, type TimeAvailable } from '../../lib/today/plan';
import { initialSession, sessionReducer, toDraft, type TodaySession } from '../../lib/today/session';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import RadioCards from '../../components/ui/RadioCards';
import ReadinessChip from '../../components/today/ReadinessChip';
import SetRow from '../../components/today/SetRow';
import RestCard from '../../components/today/RestCard';
import { EditSetSheet, ReadinessSheet, WhyWeightSheet } from '../../components/today/Sheets';

const LAST_TIME_KEY = 'ironform-last-time-available';
const TIMES: { value: TimeAvailable; title: string }[] = [
  { value: 30, title: '30 min' },
  { value: 45, title: '45 min' },
  { value: 60, title: '60+ min' },
];

function lastTime(): TimeAvailable {
  try {
    const v = Number(localStorage.getItem(LAST_TIME_KEY));
    return v === 30 || v === 45 ? v : 60;
  } catch {
    return 60;
  }
}

type EditTarget = { kind: 'top' } | { kind: 'backoff'; index: number; current: boolean };

/**
 * The new Today session: before session, top set, back-offs. Pages compute
 * nothing: loads come from buildTodayPlan, set rules from sessionReducer.
 */
export default function TodayFlow({ lift, onOpenProgress }: { lift: string; onOpenProgress: () => void }) {
  const { user, profile } = useAuth();
  const programCtx = useProgramContext();
  const readiness = useTodayReadiness(user?.id);
  const { accessories } = useDayAccessories(lift);
  const unit = (profile?.unit_preference || 'lb') as Unit;
  const draftKey = user ? `jt_draft_${user.id}_${lift}` : null;

  const [session, dispatch] = useReducer(sessionReducer, undefined, () => initialSession(lastTime()));
  const restored = useRef(false);
  const [sheet, setSheet] = useState<'readiness' | 'why' | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);

  // Restore a session in progress for this lift and week.
  useEffect(() => {
    if (restored.current || !draftKey || !profile) return;
    restored.current = true;
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
      if (draft?.flow === 'today' && draft.cycle === profile.current_cycle && draft.week === profile.current_week && draft.session) {
        dispatch({ type: 'restore', session: draft.session as TodaySession });
      }
    } catch { /* ignore a broken draft */ }
  }, [draftKey, profile]);

  const block = programCtx?.currentBlock ?? null;
  const day = programCtx?.layout.days.find(d => d.dayId === lift) ?? null;
  const state = readiness?.state ?? 'green';
  const trainingMaxes = useMemo(() => {
    const out: Partial<Record<LiftId, number>> = {};
    if (profile) for (const l of ['squat', 'bench', 'deadlift', 'ohp'] as LiftId[]) out[l] = trainingMaxFor(profile, l);
    return out;
  }, [profile]);

  const plan = useMemo(() => (programCtx && block && day && profile
    ? buildTodayPlan({
        program: programCtx.program, day, block, trainingMaxes, unit, state: profile.program_state, plates: availablePlates(profile),
        readiness: state, time: session.time,
        accessories: accessories.map(a => ({ name: a.name, sets: a.sets, reps: a.reps })),
      })
    : null), [programCtx, block, day, profile, trainingMaxes, unit, state, session.time, accessories]);

  const inSession = session.stage !== 'before';
  useWakeLock(inSession);

  // Autosave in the shape the workout bar reads.
  useEffect(() => {
    if (!draftKey || !profile || !plan || !inSession) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(toDraft(session, {
        liftType: lift,
        plannedTop: plan.top ? { weight: plan.top.weight, reps: plan.top.reps } : null,
        plannedBackoff: plan.backoff ? { weight: plan.backoff.weight, reps: plan.backoff.reps } : null,
        cycle: profile.current_cycle, week: profile.current_week, now: Date.now(),
      })));
    } catch { /* storage unavailable */ }
  }, [session, draftKey, profile, plan, inSession, lift]);

  if (!profile || !programCtx || !block || !day || !plan || !plan.lift) {
    return <div className="max-w-md mx-auto px-4 py-6 text-white" role="status">Loading today's session…</div>;
  }

  const liftLift = plan.lift;
  const name = liftNames[liftLift] ?? liftLift;
  const plates = availablePlates(profile);
  const bar = BAR_WEIGHTS[unit] ?? 45;
  const platesFor = (w: number) => platesPerSide(w, bar, plates);
  const phaseIndex = WAVE_ORDER.indexOf(block.phase as typeof WAVE_ORDER[number]);
  const weekLabel = phaseIndex >= 0 ? `Week ${phaseIndex + 1}` : programCtx.program.weekLabel(block);
  const eyebrow = programCtx.program.weekLabel(block);
  const top = plan.top;
  const backoff = plan.backoff;
  const restSeconds = REST_TIMER_DEFAULTS.main;

  const pctLabel = top?.pct != null && !plan.topSetOnly ? ` · ${Math.round(top.pct * 1000) / 10}% of training max` : '';

  const header = (
    <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4">
      <div className="max-w-md mx-auto">
        <p className="text-xs font-semibold text-gray-400 tracking-wide">{eyebrow}</p>
        <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 leading-tight">
          {session.stage === 'before' ? `${day.label} day` : name}
        </h1>
      </div>
    </div>
  );

  // ---------- Before session ----------
  if (session.stage === 'before') {
    const yellowOrTime = plan.limits.limitedBy === 'both' || (state !== 'green' && plan.limits.limitedBy === 'time');
    return (
      <div className="min-h-screen pb-24">
        {header}
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="text-h4 text-gray-900 dark:text-gray-100">Before you start</h2>
            <div className="flex items-center justify-between gap-3">
              <ReadinessChip state={state} />
              {readiness && (
                <button type="button" onClick={() => setSheet('readiness')} className="inline-flex items-center gap-0.5 min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  Why? <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{readiness?.inputs.reason ?? 'Readiness is unavailable right now, so train as written.'}</p>
            <h3 id="time-label" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time available</h3>
            <RadioCards<TimeAvailable>
              layout="segmented"
              labelId="time-label"
              value={session.time}
              onSelect={time => dispatch({ type: 'setTime', time })}
              options={TIMES}
            />
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-h3 text-gray-900 dark:text-gray-100">Today's plan</h2>
              <span className="text-xs text-gray-400">~{plan.minutes} min</span>
            </div>
            <ul className="space-y-3">
              {top && (
                <PlanRow title="Top set" detail={`${name} · ${top.weight} ${unit} × ${top.reps}${top.isAmrap ? '+' : ''}${plan.topSetOnly ? ' · light' : state !== 'green' ? ' · load unchanged' : ''}`} />
              )}
              {backoff && (
                <PlanRow
                  title="Back-offs"
                  detail={`${backoff.weight} ${unit} × ${backoff.reps} · ${backoff.cap < backoff.programCap ? `up to ${backoff.cap} ${backoff.cap === 1 ? 'set' : 'sets'} today` : `until you miss a rep, up to ${backoff.cap} sets`}`}
                />
              )}
              {plan.accessories.map(a => (
                <PlanRow
                  key={a.name}
                  title={a.name}
                  detail={`${a.sets} × ${a.reps.replace('-', '–')}${a.priority ? ' · priority accessory' : ''}`}
                  chip={a.cut ? 'Cut today' : a.priority ? 'Priority' : undefined}
                  cut={a.cut}
                />
              ))}
            </ul>
            {plan.limits.limitedBy !== 'none' && !plan.topSetOnly && (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                {yellowOrTime && state !== 'green'
                  ? `Time and readiness both limit today. ${plan.limits.limitedBy === 'readiness' ? 'Readiness' : 'Time'} is stricter, so back-offs are capped at ${plan.limits.backoffCap}. Loads stay the same.`
                  : plan.limits.limitedBy === 'time'
                    ? `Short on time, so back-offs are capped at ${plan.limits.backoffCap}. Cut accessories keep their weights for next time.`
                    : `Back-offs are capped at ${plan.limits.backoffCap} today. Loads stay the same.`}
              </p>
            )}
          </Card>

          <Button fullWidth size="lg" onClick={() => {
            try { localStorage.setItem(LAST_TIME_KEY, String(session.time)); } catch { /* storage unavailable */ }
            dispatch({ type: 'start', now: Date.now() });
          }}>
            Start session
          </Button>
        </div>
        {readiness && <ReadinessSheet open={sheet === 'readiness'} onClose={() => setSheet(null)} readiness={readiness} limits={sessionLimits(state, 60)} />}
      </div>
    );
  }

  // ---------- Top set and back-offs ----------
  const target = backoff?.reps ?? 0;
  const cap = backoff?.cap ?? 0;
  const restRunning = session.restEndsAt != null;
  const showBackoffs = !!backoff && session.top != null;
  const topDone = session.top != null;

  // What happens to the back-off load next time, from this session.
  const backoffState: BackoffLiftState = (() => {
    const stored = (profile.program_state as { backoff?: Record<string, BackoffLiftState> } | undefined)?.backoff?.[liftLift];
    return stored && stored.cycleIndex === block.cycleIndex ? stored : EMPTY_BACKOFF_STATE;
  })();
  const nextChange = session.backoffsEnded
    ? nextBackoffState(backoffState, {
        phase: block.phase,
        mainSets: [
          ...(session.top ? [{ ...session.top, kind: 'top' as const }] : []),
          ...session.backoffs.map(b => ({ ...b, kind: 'backoff' as const })),
        ],
        backoffsCapped: plan.backoffsCapped,
      }).change
    : 0;
  const fullSets = session.backoffs.filter(b => b.reps >= target).length;
  const missIndex = session.backoffs.findIndex(b => b.reps < target);

  const editTitle = editing?.kind === 'top' ? `${name} · top set` : editing ? `${name} · back-off set ${editing.index + 1}` : '';
  const editSet = editing?.kind === 'top'
    ? session.top ?? (top ? { weight: top.weight, reps: top.minReps ?? top.reps } : { weight: 0, reps: 0 })
    : editing ? session.backoffs[editing.index] ?? { weight: backoff?.weight ?? 0, reps: target } : { weight: 0, reps: 0 };

  return (
    <div className="min-h-screen pb-24">
      {header}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {top && (
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm text-gray-600 dark:text-gray-300">Top set{pctLabel}</h2>
              {topDone && <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">Done</span>}
            </div>
            {!topDone && (
              <>
                <p className="text-5xl font-black text-gray-900 dark:text-gray-100 tabular-nums">
                  {top.weight} <span className="text-2xl font-semibold text-gray-400">{unit} × {top.reps}{top.isAmrap ? '+' : ''}</span>
                </p>
                <button type="button" onClick={() => setSheet('why')} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <Info className="h-4 w-4" aria-hidden="true" /> Why this weight?
                </button>
              </>
            )}
            <SetRow
              number={1}
              name="Top set"
              weight={session.top?.weight ?? top.weight}
              reps={session.top?.reps ?? top.reps}
              unit={unit}
              plates={platesFor(session.top?.weight ?? top.weight)}
              state={topDone ? 'done' : 'current'}
              logLabel={top.isAmrap ? 'Enter reps' : 'Log'}
              onLog={() => (top.isAmrap
                ? setEditing({ kind: 'top' })
                : dispatch({ type: 'logTop', set: { weight: top.weight, reps: top.reps }, now: Date.now(), restSeconds: backoff ? restSeconds : 0 }))}
              onEdit={topDone ? undefined : () => setEditing({ kind: 'top' })}
            />
            {!topDone && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {top.isAmrap
                  ? `As many reps as you can, leaving 1 in the tank. At least ${top.minReps}.`
                  : 'Hit the target? Tap Log. Different reps or weight? Tap the numbers first.'}
              </p>
            )}
          </Card>
        )}

        {restRunning && !session.backoffsEnded && (
          <RestCard
            endsAt={session.restEndsAt!}
            totalSeconds={session.restTotal}
            onExtend={() => dispatch({ type: 'extendRest', seconds: 30 })}
            onSkip={() => dispatch({ type: 'skipRest' })}
          />
        )}

        {backoff && (
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm text-gray-600 dark:text-gray-300">Back-offs · {backoff.weight} {unit} × {backoff.reps}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${session.backoffsEnded ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                {session.backoffsEnded ? 'Done' : `Up to ${cap} today`}
              </span>
            </div>
            {!showBackoffs && (
              <p className="text-sm text-gray-600 dark:text-gray-300">Keep going until you miss a rep. The first miss ends your back-offs.</p>
            )}
            <ol className="space-y-2">
              {session.backoffs.map((b, i) => (
                <li key={i}>
                  <SetRow
                    number={i + 1} name={`Back-off set ${i + 1}`} weight={b.weight} reps={b.reps} unit={unit}
                    plates={platesFor(b.weight)} state={b.reps < target ? 'missed' : 'done'} targetReps={target}
                    onEdit={() => setEditing({ kind: 'backoff', index: i, current: false })}
                  />
                </li>
              ))}
              {!session.backoffsEnded && (
                <li>
                  <SetRow
                    number={session.backoffs.length + 1} name={`Back-off set ${session.backoffs.length + 1}`}
                    weight={backoff.weight} reps={backoff.reps} unit={unit} plates={platesFor(backoff.weight)}
                    state={topDone ? 'current' : 'upcoming'}
                    logLabel={topDone ? `Hit ${backoff.reps}` : 'Log'}
                    onLog={topDone ? () => dispatch({
                      type: 'logBackoff', set: { weight: backoff.weight, reps: backoff.reps }, target, cap, now: Date.now(), restSeconds,
                    }) : undefined}
                    onEdit={topDone ? () => setEditing({ kind: 'backoff', index: session.backoffs.length, current: true }) : undefined}
                  />
                </li>
              )}
            </ol>
            {topDone && !session.backoffsEnded && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">Missed a rep? Tap the set to enter what you got.</p>
            )}
          </Card>
        )}

        {session.backoffsEnded && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/30 p-4 text-sm text-blue-900 dark:text-blue-100" role="status">
            <p className="font-semibold">Back-offs done: {fullSets} {fullSets === 1 ? 'set' : 'sets'}</p>
            <p className="mt-1">
              {missIndex >= 0 ? `Drop-off at set ${missIndex + 1}. ` : `All ${fullSets} at target. `}
              Next {name.toLowerCase()} session: back-off load {nextChange > 0 ? 'goes up 2.5%' : nextChange < 0 ? 'drops 5%' : 'stays the same'}.
            </p>
          </div>
        )}

        {(session.backoffsEnded || (topDone && !backoff)) && (
          <Button fullWidth size="lg" onClick={() => dispatch({ type: 'goTo', stage: 'accessories' })}>
            {plan.accessories.find(a => !a.cut) ? `Next: ${plan.accessories.find(a => !a.cut)!.name}` : 'Finish session'}
          </Button>
        )}

        {session.stage === 'accessories' && (
          <Card className="p-5">
            <p className="text-sm text-gray-600 dark:text-gray-300">Accessories and the session summary come in the next part of this update.</p>
          </Card>
        )}
      </div>

      {top && (
        <WhyWeightSheet
          open={sheet === 'why'}
          onClose={() => setSheet(null)}
          weight={top.weight}
          unit={unit}
          liftName={name}
          explanation={explainWeight({ liftName: name, trainingMax: top.trainingMax, pct: top.pct, weight: top.weight, lift: liftLift, unit, weekLabel, readiness: state, topSetOnly: plan.topSetOnly, plates })}
          onOpenHistory={onOpenProgress}
        />
      )}
      <EditSetSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editTitle}
        weight={editSet.weight}
        reps={editSet.reps}
        unit={unit}
        weightStep={loadIncrement(liftLift, unit, plates)}
        repHint={editing?.kind === 'top' ? (top?.isAmrap ? `at least ${top.minReps}` : `target ${top?.reps}`) : `target ${target}`}
        note={editing?.kind === 'backoff' ? 'Below the target ends your back-offs for today.' : undefined}
        onSave={set => {
          if (!editing) return;
          if (editing.kind === 'top') dispatch({ type: 'logTop', set, now: Date.now(), restSeconds: backoff ? restSeconds : 0 });
          else if (editing.current) dispatch({ type: 'logBackoff', set, target, cap, now: Date.now(), restSeconds });
          else dispatch({ type: 'editBackoff', index: editing.index, set, target, cap });
        }}
      />
    </div>
  );
}

function PlanRow({ title, detail, chip, cut }: { title: string; detail: string; chip?: string; cut?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl p-3 ${cut ? 'border border-dashed border-gray-200 dark:border-gray-600 text-gray-400' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${cut ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{title}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{detail}</span>
      </span>
      {chip && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cut ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'}`}>
          {chip}
        </span>
      )}
    </li>
  );
}

