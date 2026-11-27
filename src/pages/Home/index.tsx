import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getGreeting } from '../../lib/calculations';
import type { LiftId, Unit } from '../../lib/programs/types';
import { positionUpdates, indexFromCycleWeek } from '../../lib/programs/position';
import { trainingMaxFor } from '../../lib/programs/maxes';
import { weekRows, nextDayToTrain } from '../../lib/programs/week';
import { WAVE_ORDER } from '../../lib/programs/fiveThreeOne/engine';
import { useProgramContext } from '../../hooks/useProgramContext';
import { useTodayReadiness } from '../../hooks/useTodayReadiness';
import { useDayAccessories } from '../../hooks/useDayAccessories';
import { PHASE_LABELS } from '../../lib/constants';
import { ChevronLeft, ChevronRight, Check, Activity } from 'lucide-react';
import { availablePlates } from '../../lib/plates';
import { buildTodayPlan } from '../../lib/today/plan';
import { readLastTime } from '../../lib/today/prefs';
import { readinessHeadline } from '../../lib/today/copy';
import { supabase } from '../../lib/supabase';
import { isConnected, loadIntegrations, type Integration } from '../../lib/integrations';
import type { StickingPoint, WeakPoints } from '../../lib/supabase';
import OneRepMaxTest from '../../components/features/OneRepMaxTest';
import AccessibleModal from '../../components/accessible/AccessibleModal';
import WeakPointPicker, { type MainLiftKey } from '../../components/features/WeakPointPicker';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import IconButton from '../../components/ui/IconButton';

const EMPTY_WEAK_POINTS: WeakPoints = { squat: [], bench: [], deadlift: [] };
const LIFTS: LiftId[] = ['squat', 'bench', 'deadlift', 'ohp'];

// Position columns to write for a new week. Only meet-date programs write
// current_week_index: for others it's ignored, and writing it would make a
// later-added meet date start mid-schedule.
function pointerColumns(index: number, writeIndex: boolean) {
  const { current_week_index, ...cycleWeek } = positionUpdates(index);
  return writeIndex ? { current_week_index, ...cycleWeek } : cycleWeek;
}

interface HomePageProps {
  onNavigate: (page: string, liftType?: string) => void;
}

/**
 * Home (proposals #3 and #12): today's readiness and session in one card,
 * then this week with exact loads. Loads come from the same plan Today uses.
 */
export default function HomePage({ onNavigate }: HomePageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [done, setDone] = useState<Map<string, string>>(new Map());
  const [skipping, setSkipping] = useState(false);
  const [showOneRMTest, setShowOneRMTest] = useState(false);
  const [showSkipWeekModal, setShowSkipWeekModal] = useState(false);
  const [pendingWeakPoints, setPendingWeakPoints] = useState<WeakPoints>(EMPTY_WEAK_POINTS);
  const [weekOffset, setWeekOffset] = useState(0);
  const [jumping, setJumping] = useState(false);
  const programCtx = useProgramContext(weekOffset);
  const readiness = useTodayReadiness(user?.id);
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  useEffect(() => {
    if (user) loadIntegrations(user.id).then(setIntegrations).catch(() => setIntegrations(null));
  }, [user]);

  useEffect(() => {
    if (user && profile) loadCompletedWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.current_cycle, profile?.current_week, profile?.program_restarted_at, weekOffset]);

  const loadCompletedWorkouts = async () => {
    if (!user || !profile) return;
    // cycle/week is a running counter kept in sync with current_week_index,
    // so it identifies the week being previewed too.
    const base = (profile.current_cycle - 1) * 4 + (profile.current_week - 1);
    const total = Math.max(0, base + weekOffset);
    let query = supabase
      .from('workout_sessions')
      .select('lift_type, completed_at')
      .eq('user_id', user.id)
      .eq('cycle', Math.floor(total / 4) + 1)
      .eq('week', (total % 4) + 1)
      .eq('is_1rm_test', false);
    // A restart rewinds to week 1, so only sessions since then count.
    if (profile.program_restarted_at) query = query.gte('completed_at', profile.program_restarted_at);
    const { data } = await query;
    // An upper session logged this week still counts as the overhead press day.
    setDone(new Map((data ?? []).map(w => [w.lift_type === 'upper' ? 'ohp' : w.lift_type, w.completed_at as string])));
  };

  // Today's day, for the readiness card's session and its accessories.
  const layout = programCtx?.layout;
  const todayDayId = layout && weekOffset === 0 ? nextDayToTrain(layout, new Set(done.keys())) : null;
  const todayDay = layout?.days.find(d => d.dayId === todayDayId) ?? null;
  const { accessories } = useDayAccessories(todayDayId ?? layout?.days[0]?.dayId ?? 'squat');

  const trainingMaxes = useMemo(() => {
    const out: Partial<Record<LiftId, number>> = {};
    if (profile) for (const l of LIFTS) out[l] = trainingMaxFor(profile, l);
    return out;
  }, [profile]);

  if (!profile || !programCtx || !layout) return null;

  const { program, schedule: waveSchedule, currentIndex: currentBlockIndex, currentBlock, viewedBlock } = programCtx;
  const unit = (profile.unit_preference || 'lb') as Unit;
  const plates = availablePlates(profile);

  const isMeetDay = (() => {
    if (!profile.meet_date) return false;
    const diffDays = (new Date(profile.meet_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 1;
  })();

  const canGoBack = currentBlockIndex >= 0
    ? currentBlockIndex + weekOffset > 0
    : (profile.current_cycle - 1) * 4 + (profile.current_week - 1) + weekOffset > 0;
  const canGoForward = currentBlockIndex >= 0
    ? currentBlockIndex + weekOffset < waveSchedule.weeks.length - 1
    : weekOffset < 52;

  const effectiveBlock = viewedBlock ?? (weekOffset === 0 ? currentBlock : null);
  const isViewing = weekOffset !== 0;
  const weekChip = (block: typeof effectiveBlock) => {
    if (!block) return '';
    const idx = WAVE_ORDER.indexOf(block.phase as typeof WAVE_ORDER[number]);
    return program.id === 'five_three_one' && idx >= 0 ? `Week ${idx + 1} · ${PHASE_LABELS[block.phase]}` : program.weekLabel(block);
  };

  // What advancing moves you to, and whether it crosses into a new wave.
  const nextAdvanceBlock = waveSchedule.weeks.length > 0 && currentBlockIndex >= 0
    ? waveSchedule.weeks[Math.min(currentBlockIndex + 1, waveSchedule.weeks.length - 1)]
    : null;
  const nextAdvanceLabel = nextAdvanceBlock ? program.weekLabel(nextAdvanceBlock) : 'next week';
  const upcomingWaveLabel = nextAdvanceBlock ? program.waveLabel(nextAdvanceBlock) : undefined;
  const upcomingCycle = nextAdvanceBlock?.cycleIndex;
  const needsWeakPointReview = !!currentBlock && program.isWaveBoundary(currentBlock.phase, nextAdvanceBlock?.phase)
    && profile.weak_points_reviewed_cycle !== upcomingCycle;

  const rows = weekRows({
    layout, program, block: effectiveBlock && effectiveBlock.phase !== 'meet_week' ? effectiveBlock : null,
    trainingMaxes, unit, plates, state: profile.program_state, done, isCurrentWeek: !isViewing,
  });
  const allDone = rows.every(r => r.state === 'done');

  const plan = todayDay && currentBlock && !isViewing
    ? buildTodayPlan({
        program, day: todayDay, block: currentBlock, trainingMaxes, unit, state: profile.program_state, plates,
        readiness: readiness?.state ?? 'green', time: readLastTime(profile),
        accessories: accessories.map(a => ({ name: a.name, sets: a.sets, reps: a.reps })),
      })
    : null;
  const top = plan?.top;
  const liftLine = top
    ? top.pct != null && !plan?.topSetOnly
      ? `${top.reps}${top.isAmrap ? '+' : 's'} at ${Math.round(top.pct * 1000) / 10}% of your ${top.trainingMax} ${unit} training max`
      : `${top.sets > 1 ? `${top.sets} × ` : ''}${top.reps} at ${top.weight} ${unit}`
    : null;

  const handleSkipWeek = async () => {
    if (!user) return;
    setShowSkipWeekModal(false);
    setSkipping(true);
    try {
      const hasSchedule = waveSchedule.weeks.length > 0 && currentBlockIndex >= 0;
      const nextIndex = hasSchedule
        ? Math.min(currentBlockIndex + 1, waveSchedule.weeks.length - 1)
        : indexFromCycleWeek(profile.current_cycle, profile.current_week) + 1;
      const updates: Record<string, unknown> = { ...pointerColumns(nextIndex, hasSchedule), updated_at: new Date().toISOString() };
      // Wave boundary: save any weak-point edits and mark the wave reviewed.
      if (needsWeakPointReview && upcomingCycle != null) {
        updates.weak_points = pendingWeakPoints;
        updates.weak_points_reviewed_cycle = upcomingCycle;
      }
      await supabase.from('user_profiles').update(updates).eq('id', user.id);
      await refreshProfile();
    } catch (error) {
      console.error('Error advancing week:', error);
    } finally {
      setSkipping(false);
    }
  };

  const handleJumpToWeek = async () => {
    if (!user || weekOffset === 0) return;
    setJumping(true);
    try {
      const hasSchedule = waveSchedule.weeks.length > 0 && currentBlockIndex >= 0;
      const targetIndex = hasSchedule
        ? Math.max(0, Math.min(waveSchedule.weeks.length - 1, currentBlockIndex + weekOffset))
        : Math.max(0, indexFromCycleWeek(profile.current_cycle, profile.current_week) + weekOffset);
      await supabase.from('user_profiles').update({ ...pointerColumns(targetIndex, hasSchedule), updated_at: new Date().toISOString() }).eq('id', user.id);
      await refreshProfile();
      setWeekOffset(0);
    } catch (err) {
      console.error('Error jumping to week:', err);
    } finally {
      setJumping(false);
    }
  };

  const handleTogglePendingWeakPoint = (lift: MainLiftKey, point: StickingPoint) => {
    setPendingWeakPoints(prev => {
      const current = prev[lift];
      return { ...prev, [lift]: current.includes(point) ? current.filter(p => p !== point) : [...current, point] };
    });
  };

  const openAdvance = () => {
    if (needsWeakPointReview) setPendingWeakPoints(profile.weak_points ?? EMPTY_WEAK_POINTS);
    setShowSkipWeekModal(true);
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Ironform" title={getGreeting()} titleClassName="font-black" />
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {isMeetDay && (
          <Card onClick={() => setShowOneRMTest(true)} className="w-full p-5 flex items-center gap-4 text-left hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 p-3"><Activity className="h-6 w-6 text-blue-700 dark:text-blue-300" aria-hidden="true" /></span>
            <span className="flex-1">
              <span className="block text-h4 text-gray-900 dark:text-gray-100">Meet day: log your attempts</span>
              <span className="block text-sm text-gray-600 dark:text-gray-300">Guided warm-up and attempt logging for your lifts</span>
            </span>
            <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Card>
        )}

        {/* Readiness and today's session */}
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="text-h4 text-gray-900 dark:text-gray-100">Readiness</h2>
            {readiness ? (
              <>
                <p className="mt-1">
                  <span className="text-6xl font-black tabular-nums text-blue-700 dark:text-blue-300">{readiness.score}</span>
                  <span className="text-xl font-semibold text-gray-400">/100</span>
                </p>
                <p className="text-h3 text-gray-900 dark:text-gray-100">{readinessHeadline(readiness.state)}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{readiness.inputs.reason}</p>
                {readiness.inputs.note && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{readiness.inputs.note}</p>}
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Working out today's readiness…</p>
            )}
          </div>

          {!isViewing && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
              {plan && todayDay && top ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">{weekChip(currentBlock)}</span>
                    <span className="text-xs text-gray-400">~{plan.minutes} min</span>
                  </div>
                  <div>
                    <h3 className="text-h4 text-gray-900 dark:text-gray-100">{todayDay.label}</h3>
                    {liftLine && <p className="text-xs text-gray-500 dark:text-gray-400">{liftLine}</p>}
                  </div>
                  <ul className="grid grid-cols-3 gap-2">
                    <SessionTile value={`${top.weight}`} label={top.isAmrap ? `Top set · ${top.reps}+` : 'Top set'} />
                    {plan.backoff
                      ? <SessionTile value={`up to ${plan.backoff.cap}`} label={`Back-offs × ${plan.backoff.weight}`} />
                      : <SessionTile value="—" label={plan.topSetOnly ? 'No back-offs today' : 'Back-offs'} />}
                    <SessionTile value={String(plan.accessories.filter(a => !a.cut).length)} label="Accessories" />
                  </ul>
                  <Button fullWidth size="lg" onClick={() => onNavigate('workout', todayDay.dayId)}>
                    Start {todayDay.label.toLowerCase()}
                  </Button>
                </>
              ) : allDone ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Every day this week is done.</p>
                  <Button fullWidth size="lg" onClick={openAdvance} disabled={skipping}>
                    {skipping ? 'Moving to next week…' : `Start ${nextAdvanceLabel}`}
                  </Button>
                </>
              ) : todayDay && rows.find(r => r.dayId === todayDay.dayId)?.needsMax ? (
                <Button fullWidth size="lg" onClick={() => onNavigate('workout', todayDay.dayId)}>
                  Set your {todayDay.label.toLowerCase()} max
                </Button>
              ) : null}
            </div>
          )}
        </Card>

        {/* This week */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h2 text-gray-900 dark:text-gray-100">This week</h2>
              {(isViewing || effectiveBlock) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {weekChip(effectiveBlock)}
                  {isViewing && ` · ${weekOffset > 0 ? `${weekOffset} ${weekOffset === 1 ? 'week' : 'weeks'} ahead` : `${-weekOffset} ${weekOffset === -1 ? 'week' : 'weeks'} back`}`}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <IconButton label="Previous week" onClick={() => setWeekOffset(o => o - 1)} disabled={!canGoBack}>
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </IconButton>
              <IconButton label="Next week" onClick={() => setWeekOffset(o => o + 1)} disabled={!canGoForward}>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          {effectiveBlock?.phase === 'deload' && (
            <p className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-gray-700 dark:text-gray-200">
              Deload week. Lighter weights, same movements. Complete the sets and move on.
            </p>
          )}

          <ol className="space-y-2">
            {rows.map(row => {
              const isDone = row.state === 'done';
              const isToday = row.state === 'today';
              const detail = isDone ? `Done${row.doneOn ? ` · ${row.doneOn}` : ''}` : row.needsMax ? 'Set your max' : row.lift === null ? 'Accessory work' : null;
              const content = (
                <>
                  <span className={`w-6 text-sm font-semibold tabular-nums ${isDone ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>{row.number}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-xs ${isDone ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {row.label}{isToday ? ' · Today' : ''}
                    </span>
                    {detail ? (
                      <span className={`block text-sm font-semibold ${isDone ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-300'}`}>{detail}</span>
                    ) : row.weight != null ? (
                      <span className="block text-xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                        {row.weight} <span className="text-sm font-semibold text-gray-400">{unit}</span>
                      </span>
                    ) : null}
                  </span>
                  {isDone
                    ? <Check className="h-5 w-5 text-green-600 dark:text-green-400" aria-label="Done" />
                    : !isViewing && <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                </>
              );
              const rowClass = `flex w-full items-center gap-3 rounded-xl p-3 text-left ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`;
              return (
                <li key={row.dayId}>
                  {isViewing ? (
                    <div className={rowClass}>{content}</div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('workout', row.dayId)}
                      className={`${rowClass} min-h-[56px] hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                      aria-label={`Day ${Number(row.number)}: ${row.label}${isToday ? ', today' : ''}${detail ? `, ${detail}` : row.weight != null ? `, ${row.weight} ${unit}` : ''}`}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {isViewing && (
            <Button fullWidth onClick={handleJumpToWeek} disabled={jumping}>
              {jumping ? 'Updating program…' : weekOffset > 0
                ? `Skip ${weekOffset} ${weekOffset === 1 ? 'week' : 'weeks'} ahead`
                : `Go back ${-weekOffset} ${weekOffset === -1 ? 'week' : 'weeks'}`}
            </Button>
          )}
        </Card>

        {/* Connect: only while no wearable is connected. */}
        {integrations && !isConnected(integrations) && (
          <Card className="p-5 flex items-center gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Want a read on today, not just last week?</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Connect Oura or Strava to add sleep, HRV and runs.</p>
            </div>
            <Button size="sm" variant="tertiary" onClick={() => onNavigate('integrations')}>Connect</Button>
          </Card>
        )}
      </div>

      {showOneRMTest && (
        <OneRepMaxTest
          onClose={() => setShowOneRMTest(false)}
          onComplete={() => { setShowOneRMTest(false); loadCompletedWorkouts(); }}
        />
      )}

      <AccessibleModal
        isOpen={showSkipWeekModal}
        onClose={() => setShowSkipWeekModal(false)}
        title={needsWeakPointReview && upcomingWaveLabel ? `New wave: ${upcomingWaveLabel}` : 'Move to next week'}
        description={needsWeakPointReview ? 'Anything changed with your sticking points?' : `Move to ${nextAdvanceLabel}`}
        size="sm"
      >
        {needsWeakPointReview ? (
          <div className="mb-6">
            <WeakPointPicker value={pendingWeakPoints} onToggle={handleTogglePendingWeakPoint} />
          </div>
        ) : (
          <p className="text-body-md text-gray-600 dark:text-gray-300 mb-6">
            {allDone
              ? "You've done every day this week. Ready to move on?"
              : "You haven't done every day yet. Move on anyway?"}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" disabled={skipping} onClick={() => setShowSkipWeekModal(false)}>Cancel</Button>
          <Button size="md" className="flex-1" disabled={skipping} onClick={handleSkipWeek}>
            {needsWeakPointReview && upcomingWaveLabel ? `Start ${upcomingWaveLabel}` : 'Next week'}
          </Button>
        </div>
      </AccessibleModal>
    </div>
  );
}

function SessionTile({ value, label }: { value: string; label: string }) {
  return (
    <li className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3">
      <span className="block text-lg font-black tabular-nums text-gray-900 dark:text-gray-100">{value}</span>
      <span className="block text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </li>
  );
}
