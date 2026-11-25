import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateJuggernautSets, getGreeting, RepWave, WavePhase } from '../../lib/calculations';
import type { Unit } from '../../lib/programs/types';
import { positionUpdates, indexFromCycleWeek } from '../../lib/programs/position';
import { trainingMaxFor } from '../../lib/programs/maxes';
import { useProgramContext } from '../../hooks/useProgramContext';
import { PHASE_LABELS, PHASE_DESCRIPTIONS, CYCLE_TO_WAVE, WEEK_TO_PHASE, WAVE_LABELS, WEIGHT_DISPLAY_RANGE_LOW, WEIGHT_DISPLAY_RANGE_HIGH } from '../../lib/constants';
import { ChevronLeft, ChevronRight, Check, Activity, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { StickingPoint, WeakPoints } from '../../lib/supabase';
import { useRipple } from '../../hooks/useAnimations';
import OneRepMaxTest from '../../components/features/OneRepMaxTest';
import AccessibleModal from '../../components/accessible/AccessibleModal';
import WeakPointPicker, { type MainLiftKey } from '../../components/features/WeakPointPicker';
import WaveScheduleChart from '../Progress/components/WaveScheduleChart';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import IconButton from '../../components/ui/IconButton';
import Tile from '../../components/ui/Tile';

const EMPTY_WEAK_POINTS: WeakPoints = { squat: [], bench: [], deadlift: [] };

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


export default function HomePage({ onNavigate }: HomePageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [workoutData, setWorkoutData] = useState<Map<string, { calculated_1rm: number }>>(new Map());
  const [skipping, setSkipping] = useState(false);
  const [showOneRMTest, setShowOneRMTest] = useState(false);
  const [showSkipWeekModal, setShowSkipWeekModal] = useState(false);
  const [pendingWeakPoints, setPendingWeakPoints] = useState<WeakPoints>(EMPTY_WEAK_POINTS);
  const createRipple = useRipple();
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [jumping, setJumping] = useState(false);
  const programCtx = useProgramContext(weekOffset);

  useEffect(() => {
    if (user && profile) {
      loadCompletedWorkouts();
    }
  }, [user, profile?.current_cycle, profile?.current_week, profile?.program_restarted_at, weekOffset]);

  const loadCompletedWorkouts = async () => {
    if (!user || !profile) return;

    // Same cycle/week arithmetic as viewedManual/handleJumpToWeek below —
    // cycle/week is a running counter kept in sync with current_week_index
    // regardless of program mode, so it doubles as the id for "which week
    // is being previewed" here.
    const base = (profile.current_cycle - 1) * 4 + (profile.current_week - 1);
    const total = Math.max(0, base + weekOffset);
    const viewedWeek = (total % 4) + 1;
    const viewedCycle = Math.floor(total / 4) + 1;

    // A restart rewinds to cycle 1, week 1, so only sessions logged since
    // then count as complete — earlier ones stay in history.
    let query = supabase
      .from('workout_sessions')
      .select('lift_type, calculated_1rm')
      .eq('user_id', user.id)
      .eq('cycle', viewedCycle)
      .eq('week', viewedWeek)
      .eq('is_1rm_test', false);
    if (profile.program_restarted_at) {
      query = query.gte('completed_at', profile.program_restarted_at);
    }
    const { data } = await query;

    if (data) {
      // The overhead press day replaced the old upper day, so an upper session
      // logged this week still counts as that day done.
      const dayOf = (liftType: string) => (liftType === 'upper' ? 'ohp' : liftType);
      setCompletedWorkouts(new Set(data.map(w => dayOf(w.lift_type))));
      const dataMap = new Map();
      data.forEach(w => {
        dataMap.set(dayOf(w.lift_type), { calculated_1rm: w.calculated_1rm });
      });
      setWorkoutData(dataMap);
    }
  };

  const handleSkipWeek = async () => {
    if (!user || !profile) return;

    setShowSkipWeekModal(false);
    setSkipping(true);
    try {
      // Meet-date programs advance through the schedule; others count up from
      // cycle/week. Either way position is written through positionUpdates.
      const weeksCount = waveSchedule.weeks.length;
      const hasSchedule = weeksCount > 0 && currentBlockIndex >= 0;
      const nextIndex = hasSchedule
        ? Math.min(currentBlockIndex + 1, weeksCount - 1)
        : indexFromCycleWeek(profile.current_cycle, profile.current_week) + 1;
      const updates: Record<string, unknown> = {
        ...pointerColumns(nextIndex, hasSchedule),
        updated_at: new Date().toISOString(),
      };

      // Wave boundary: persist any weak-point edits from the check-in prompt
      // and mark this wave reviewed so it isn't asked again until the next one.
      if (needsWeakPointReview && upcomingCycle != null) {
        updates.weak_points = pendingWeakPoints;
        updates.weak_points_reviewed_cycle = upcomingCycle;
      }

      await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      await refreshProfile();
    } catch (error) {
      console.error('Error skipping week:', error);
    } finally {
      setSkipping(false);
    }
  };

  const handleTogglePendingWeakPoint = (lift: MainLiftKey, point: StickingPoint) => {
    setPendingWeakPoints(prev => {
      const current = prev[lift];
      const updated = current.includes(point)
        ? current.filter(p => p !== point)
        : [...current, point];
      return { ...prev, [lift]: updated };
    });
  };

  const handleJumpToWeek = async () => {
    if (!user || !profile || weekOffset === 0) return;
    setJumping(true);
    try {
      const weeksCount = waveSchedule.weeks.length;
      const hasSchedule = weeksCount > 0 && currentBlockIndex >= 0;
      const targetIndex = hasSchedule
        ? Math.max(0, Math.min(weeksCount - 1, currentBlockIndex + weekOffset))
        : Math.max(0, indexFromCycleWeek(profile.current_cycle, profile.current_week) + weekOffset);
      const updates: Record<string, unknown> = {
        ...pointerColumns(targetIndex, hasSchedule),
        updated_at: new Date().toISOString(),
      };

      await supabase.from('user_profiles').update(updates).eq('id', user.id);
      await refreshProfile();
      setWeekOffset(0);
    } catch (err) {
      console.error('Error jumping to week:', err);
    } finally {
      setJumping(false);
    }
  };

  if (!profile || !programCtx) return null;

  const isMeetDay = (() => {
    if (!profile.meet_date) return false;
    const meet = new Date(profile.meet_date);
    const now = new Date();
    const diffDays = (meet.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 1;
  })();

  // Schedule and current/viewed week come from one shared resolver
  // (useProgramContext), so Home and WorkoutDetail can't disagree.
  const { program, layout, schedule: waveSchedule, currentIndex: currentBlockIndex, currentBlock, viewedBlock } = programCtx;

  // For users without a meet date, compute the cycle/week at the given offset
  const viewedManual = !profile.meet_date ? (() => {
    const base = (profile.current_cycle - 1) * 4 + (profile.current_week - 1);
    const total = Math.max(0, base + weekOffset);
    return { week: (total % 4) + 1 as 1 | 2 | 3 | 4, cycle: Math.floor(total / 4) + 1 };
  })() : null;

  const canGoBack = currentBlockIndex >= 0
    ? currentBlockIndex + weekOffset > 0
    : (profile.current_cycle - 1) * 4 + (profile.current_week - 1) + weekOffset > 0;
  const canGoForward = currentBlockIndex >= 0
    ? currentBlockIndex + weekOffset < waveSchedule.weeks.length - 1
    : weekOffset < 52;

  const effectiveBlock = viewedBlock ?? (weekOffset === 0 ? currentBlock : null);
  const displayWave: RepWave = effectiveBlock?.wave ?? CYCLE_TO_WAVE[viewedManual?.cycle ?? profile.current_cycle] ?? 3;
  const displayPhase: WavePhase = effectiveBlock?.phase ?? WEEK_TO_PHASE[viewedManual?.week ?? profile.current_week] ?? 'deload';

  // Title of the week being shown. A schedule names its own weeks; the manual
  // (no schedule) Juggernaut path still derives wave and phase from cycle/week.
  const weekTitle = effectiveBlock ? program.weekLabel(effectiveBlock) : `${displayWave}-Rep ${PHASE_LABELS[displayPhase]}`;

  const isDeload = displayPhase === 'deload';
  const isViewing = weekOffset !== 0;

  // What "Advance Week" will move you to, for the confirmation button/modal.
  const nextAdvanceBlock = waveSchedule.weeks.length > 0 && currentBlockIndex >= 0
    ? waveSchedule.weeks[Math.min(currentBlockIndex + 1, waveSchedule.weeks.length - 1)]
    : null;
  const nextAdvanceLabel = nextAdvanceBlock
    ? program.weekLabel(nextAdvanceBlock)
    : `Week ${profile.current_week === 4 ? 1 : profile.current_week + 1}`;

  // Manual (no meet date) programs have no peaking block — wrapping week 4
  // always lands back on accumulation of the next cycle's wave.
  const manualPath = !nextAdvanceBlock && !profile.meet_date;
  const upcomingWaveLabel: string | undefined = manualPath
    ? WAVE_LABELS[CYCLE_TO_WAVE[profile.current_cycle + 1] ?? 3]
    : nextAdvanceBlock ? program.waveLabel(nextAdvanceBlock) : undefined;
  const upcomingCycle: number | undefined = manualPath
    ? profile.current_cycle
    : nextAdvanceBlock?.cycleIndex;
  const upcomingPhase: WavePhase | undefined = manualPath
    ? 'accumulation'
    : nextAdvanceBlock?.phase;
  const needsWeakPointReview = program.isWaveBoundary(displayPhase, upcomingPhase)
    && profile.weak_points_reviewed_cycle !== upcomingCycle;

  // Days come from the layout. An accessory-only day has no main lift; a day
  // whose lift has no max yet (overhead press is optional) asks for one.
  const workouts = layout.days.map(day => {
    const max = trainingMaxFor(profile, day.primary);
    return {
      name: day.label,
      max,
      type: day.dayId,
      lift: day.primary,
      accessoryOnly: day.primary === null,
      needsMax: day.primary !== null && max <= 0,
    };
  });
  const dayCount = layout.days.length;
  const completedCount = layout.days.filter(d => completedWorkouts.has(d.dayId)).length;

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Ironform" title={getGreeting()} titleClassName="font-bold" />
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* A schedule with no meet date just repeats, so there is no road map to chart. */}
        {!waveSchedule.repeats && (
          <Card className="px-6 py-8">
            <WaveScheduleChart
              schedule={waveSchedule}
              program={program}
              trainingMaxes={{ squat: profile.squat_max, bench: profile.bench_max, deadlift: profile.deadlift_max }}
              unit={profile.unit_preference || 'lb'}
              currentWeekIndex={currentBlockIndex}
            />
          </Card>
        )}

        {isMeetDay && (
          <Tile
            onClick={() => setShowOneRMTest(true)}
            title="Meet Day — Log Attempts"
            description="Guided warm-up and attempt logging for your lifts"
            leading={
              <div className="bg-blue-50 rounded-full p-3">
                <Activity className="w-6 h-6 text-blue-700" />
              </div>
            }
            trailing={<ChevronRight className="w-6 h-6 flex-shrink-0" />}
            className="bg-white text-blue-700 rounded-2xl shadow-sm p-6 hover:bg-blue-50 hover-lift focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700 dark:focus:ring-offset-blue-900"
          />
        )}

        {/* Week navigator */}
        <Card className="p-5 flex items-center justify-between">
          <IconButton
            label="Previous week"
            onClick={() => setWeekOffset(o => o - 1)}
            disabled={!canGoBack}
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </IconButton>
          <div className="text-center">
            <p className="text-body-md-semibold text-gray-900 dark:text-gray-100">
              {weekTitle}
            </p>
            <p className="text-body-sm text-gray-400 dark:text-gray-400 mt-0.5">
              {isViewing
                ? weekOffset > 0
                  ? `${weekOffset} week${weekOffset !== 1 ? 's' : ''} ahead`
                  : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) !== 1 ? 's' : ''} back`
                : 'Current week'}
            </p>
          </div>
          <IconButton
            label="Next week"
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={!canGoForward}
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </IconButton>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h2 text-gray-900 dark:text-gray-100">Workouts</h2>
            {isViewing && (
              <span className="text-body-sm-semibold text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
                Preview
              </span>
            )}
          </div>
          {isDeload && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4">
              <p className="text-body-md-semibold text-gray-900 dark:text-gray-100 mb-1">Deload Week</p>
              <p className="text-body-sm text-gray-600 dark:text-gray-300">Lighter weights, same movements. Complete the sets and move on.</p>
            </div>
          )}
          <div className="space-y-3">
            {workouts.map((workout, index) => {
              const isCompleted = completedWorkouts.has(workout.type);
              const sessionData = workoutData.get(workout.type);
              const projected1RM = sessionData?.calculated_1rm;
              // No main-lift weight to show: accessory-only day, or a lift still missing its max.
              const isUpperDayWorkout = workout.accessoryOnly || workout.needsMax;
              const unit = profile.unit_preference || 'lb';
              const roundTo = unit === 'kg' ? 2.5 : 5;
              const baseWeight = (!isUpperDayWorkout && workout.lift && effectiveBlock && effectiveBlock.phase !== 'meet_week')
                ? program.prescribe({ block: effectiveBlock, lift: workout.lift, trainingMax: workout.max, unit: unit as Unit }).groups[0]?.weight ?? null
                : (!isUpperDayWorkout && !effectiveBlock && viewedManual && workout.max > 0)
                  ? calculateJuggernautSets(CYCLE_TO_WAVE[viewedManual.cycle] ?? 3, WEEK_TO_PHASE[viewedManual.week] ?? 'accumulation', workout.max, unit).weight
                  : null;
              const weightLow = baseWeight !== null ? Math.round(baseWeight * WEIGHT_DISPLAY_RANGE_LOW / roundTo) * roundTo : null;
              const weightHigh = baseWeight !== null ? Math.round(baseWeight * WEIGHT_DISPLAY_RANGE_HIGH / roundTo) * roundTo : null;

              const trailing = isCompleted
                ? <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                : !isViewing
                  ? <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-300 flex-shrink-0" />
                  : null;

              return (
                <Tile
                  key={workout.type}
                  onClick={(e) => {
                    if (isViewing) return;
                    createRipple(e);
                    onNavigate('workout', workout.type);
                  }}
                  style={{ animationDelay: `${160 + index * 40}ms` }}
                  className={`animate-enter ${isCompleted
                      ? `bg-green-50 dark:bg-green-900/20 ${isViewing ? 'cursor-default' : 'hover:bg-green-100 dark:hover:bg-green-900/30 hover-scale active-press ripple-container'}`
                      : `bg-gray-50 dark:bg-gray-700 ${isViewing ? 'cursor-default' : 'hover:bg-gray-100 dark:hover:bg-gray-600 hover-scale active-press ripple-container'}`
                    }`}
                  trailing={trailing}
                >
                  <p className={`text-eyebrow tracking-wide mb-1 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'
                    }`}>
                    {workout.name}
                  </p>
                  {isCompleted ? (
                    <p className="text-body-lg-bold text-green-700 dark:text-green-300 tabular-nums">
                      {
                      projected1RM ? 
                        <>
                          {`${Math.round(projected1RM)} ${unit} `}
                          <span className="text-body-sm-semibold">proj.</span>
                        </>
                        : 'Done'
                      }
                    </p>
                  ) : workout.needsMax ? (
                    <p className="text-body-md text-gray-500 dark:text-gray-300">Set your max</p>
                  ) : workout.accessoryOnly ? (
                    <p className="text-body-md text-gray-500 dark:text-gray-300">Accessory work</p>
                  ) : weightLow !== null && weightHigh !== null ? (
                    <p className="text-body-lg-bold font-black tabular-nums leading-tight text-gray-900 dark:text-gray-100">
                      {weightLow}<wbr />–{weightHigh} <span className="text-sm font-medium text-gray-400 dark:text-gray-300">{unit}</span>
                    </p>
                  ) : (
                    <p className="text-body-sm text-gray-500 dark:text-gray-300">—</p>
                  )}
                </Tile>
              );
            })}
          </div>
          {isViewing ? (
            <Button fullWidth className="mt-4" onClick={handleJumpToWeek} disabled={jumping}>
              {jumping
                ? 'Updating program…'
                : weekOffset > 0
                  ? `Skip ${weekOffset} week${weekOffset !== 1 ? 's' : ''} ahead`
                  : `Go back ${Math.abs(weekOffset)} week${Math.abs(weekOffset) !== 1 ? 's' : ''}`}
            </Button>
          ) : completedCount === dayCount ? (
            <Button
              fullWidth
              className="mt-4"
              onClick={() => {
                if (needsWeakPointReview) setPendingWeakPoints(profile.weak_points ?? EMPTY_WEAK_POINTS);
                setShowSkipWeekModal(true);
              }}
              disabled={skipping}
            >
              {skipping ? 'Advancing your program...' : `Start ${nextAdvanceLabel}`}
            </Button>
          ) : null}
        </Card>
      </div>

      {showOneRMTest && (
        <OneRepMaxTest
          onClose={() => setShowOneRMTest(false)}
          onComplete={() => {
            setShowOneRMTest(false);
            loadCompletedWorkouts();
          }}
        />
      )}

      <AccessibleModal
        isOpen={showSkipWeekModal}
        onClose={() => setShowSkipWeekModal(false)}
        title={needsWeakPointReview && upcomingWaveLabel ? `New wave: ${upcomingWaveLabel}` : 'Move to Next Week'}
        description={needsWeakPointReview ? 'Anything changed with your sticking points?' : `Skip to ${nextAdvanceLabel}`}
        size="sm"
      >
        {needsWeakPointReview ? (
          <div className="mb-6">
            <WeakPointPicker value={pendingWeakPoints} onToggle={handleTogglePendingWeakPoint} />
          </div>
        ) : (
          <p className="text-body-md text-gray-600 dark:text-gray-300 mb-6">
            {completedCount === dayCount
              ? "You've completed all workouts for this week. Ready to move to the next week?"
              : "You haven't completed all workouts yet. Are you sure you want to skip ahead?"}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" disabled={skipping} onClick={() => setShowSkipWeekModal(false)}>
            Cancel
          </Button>
          <Button size="md" className="flex-1" disabled={skipping} onClick={handleSkipWeek}>
            {needsWeakPointReview && upcomingWaveLabel ? `Start ${upcomingWaveLabel}` : 'Advance Week'}
          </Button>
        </div>
      </AccessibleModal>
    </div>
  );
}
