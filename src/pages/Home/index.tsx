import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateJuggernautSets, calculatePeakingSets, getGreeting, buildWaveSchedule, MS_PER_WEEK, RepWave, WavePhase } from '../../lib/calculations';
import { DEFAULT_PROGRAM_WEEKS, PHASE_LABELS, PHASE_DESCRIPTIONS, CYCLE_TO_WAVE, WEEK_TO_PHASE, WEIGHT_DISPLAY_RANGE_LOW, WEIGHT_DISPLAY_RANGE_HIGH } from '../../lib/constants';
import { ChevronLeft, ChevronRight, Check, Activity, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRipple } from '../../hooks/useAnimations';
import OneRepMaxTest from '../../components/features/OneRepMaxTest';
import AccessibleModal from '../../components/accessible/AccessibleModal';
import WaveScheduleChart from '../Progress/components/WaveScheduleChart';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import IconButton from '../../components/ui/IconButton';
import Tile from '../../components/ui/Tile';

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
  const createRipple = useRipple();
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [jumping, setJumping] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadCompletedWorkouts();
    }
  }, [user, profile?.current_cycle, profile?.current_week]);

  const loadCompletedWorkouts = async () => {
    if (!user || !profile) return;

    const { data } = await supabase
      .from('workout_sessions')
      .select('lift_type, calculated_1rm')
      .eq('user_id', user.id)
      .eq('cycle', profile.current_cycle)
      .eq('week', profile.current_week);

    if (data) {
      setCompletedWorkouts(new Set(data.map(w => w.lift_type)));
      const dataMap = new Map();
      data.forEach(w => {
        dataMap.set(w.lift_type, { calculated_1rm: w.calculated_1rm });
      });
      setWorkoutData(dataMap);
    }
  };

  const handleSkipWeek = async () => {
    if (!user || !profile) return;

    setShowSkipWeekModal(false);
    setSkipping(true);
    try {
      let nextWeek = profile.current_week + 1;
      let nextCycle = profile.current_cycle;

      if (nextWeek > 4) {
        nextWeek = 1;
        nextCycle += 1;
      }

      const updates: Record<string, unknown> = {
        current_week: nextWeek,
        current_cycle: nextCycle,
        updated_at: new Date().toISOString(),
      };

      // Meet-date programs track position explicitly via current_week_index —
      // advancing is driven by finishing the week, not by wall-clock date.
      const weeksCount = waveSchedule.weeks.length;
      if (profile.meet_date && weeksCount > 0 && currentBlockIndex >= 0) {
        updates.current_week_index = Math.min(currentBlockIndex + 1, weeksCount - 1);
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

  const handleJumpToWeek = async () => {
    if (!user || !profile || weekOffset === 0) return;
    setJumping(true);
    try {
      const base = (profile.current_cycle - 1) * 4 + (profile.current_week - 1);
      const newTotal = Math.max(0, base + weekOffset);

      const updates: Record<string, unknown> = {
        current_week: (newTotal % 4) + 1,
        current_cycle: Math.floor(newTotal / 4) + 1,
        updated_at: new Date().toISOString(),
      };

      const weeksCount = waveSchedule.weeks.length;
      if (profile.meet_date && weeksCount > 0 && currentBlockIndex >= 0) {
        updates.current_week_index = Math.max(0, Math.min(weeksCount - 1, currentBlockIndex + weekOffset));
      }

      await supabase.from('user_profiles').update(updates).eq('id', user.id);
      await refreshProfile();
      setWeekOffset(0);
    } catch (err) {
      console.error('Error jumping to week:', err);
    } finally {
      setJumping(false);
    }
  };

  if (!profile) return null;

  const isMeetDay = (() => {
    if (!profile.meet_date) return false;
    const meet = new Date(profile.meet_date);
    const now = new Date();
    const diffDays = (meet.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 1;
  })();

  const scheduleStart = profile.program_start_date
    ? new Date(profile.program_start_date)
    : profile.meet_date
      ? new Date(new Date(profile.meet_date).getTime() - DEFAULT_PROGRAM_WEEKS * MS_PER_WEEK)
      : new Date();

  const waveSchedule = profile.meet_date
    ? buildWaveSchedule(scheduleStart, new Date(profile.meet_date))
    : { weeks: [], adjustments: [], skippedWaves: [], totalWeeks: 0, peakWeekIndex: -1 };

  // Index of the week that contains today — only used as the initial position
  // before the user has ever advanced/jumped a week.
  const rawDateIndex = waveSchedule.weeks.findIndex(
    w => w.startDate.getTime() <= Date.now() && w.endDate.getTime() >= Date.now()
  );
  // If today falls in the pre-program gap (startOffset > 0), use the first upcoming week
  const dateFallbackIndex = rawDateIndex >= 0
    ? rawDateIndex
    : (waveSchedule.weeks.length > 0 && waveSchedule.weeks[0].startDate.getTime() > Date.now())
      ? 0
      : -1;

  // Once set, current_week_index is the source of truth: progress moves when
  // the user finishes/skips a week, not on its own with the calendar.
  const currentBlockIndex = waveSchedule.weeks.length === 0
    ? -1
    : profile.current_week_index != null
      ? Math.max(0, Math.min(waveSchedule.weeks.length - 1, profile.current_week_index))
      : dateFallbackIndex;
  const currentBlock = currentBlockIndex >= 0 ? waveSchedule.weeks[currentBlockIndex] : null;

  // Viewed block — clamped to valid range
  const viewedBlockIndex = currentBlockIndex >= 0
    ? Math.max(0, Math.min(waveSchedule.weeks.length - 1, currentBlockIndex + weekOffset))
    : -1;
  const viewedBlock = viewedBlockIndex >= 0 ? waveSchedule.weeks[viewedBlockIndex] : null;

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

  const isDeload = displayPhase === 'deload';
  const isViewing = weekOffset !== 0;

  // What "Advance Week" will move you to, for the confirmation button/modal.
  const nextAdvanceBlock = profile.meet_date && waveSchedule.weeks.length > 0 && currentBlockIndex >= 0
    ? waveSchedule.weeks[Math.min(currentBlockIndex + 1, waveSchedule.weeks.length - 1)]
    : null;
  const nextAdvanceLabel = nextAdvanceBlock
    ? nextAdvanceBlock.phase === 'meet_week'
      ? 'Meet Week'
      : nextAdvanceBlock.phase === 'peaking'
        ? `Peaking Week ${nextAdvanceBlock.peakWeek}`
        : `${nextAdvanceBlock.wave}-Rep ${PHASE_LABELS[nextAdvanceBlock.phase]}`
    : `Week ${profile.current_week === 4 ? 1 : profile.current_week + 1}`;

  const workouts = [
    { name: 'Squat', max: profile.squat_max, type: 'squat' },
    { name: 'Upper', max: 0, type: 'upper' },
    { name: 'Deadlift', max: profile.deadlift_max, type: 'deadlift' },
    { name: 'Bench', max: profile.bench_max, type: 'bench' },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Ironform" title={getGreeting()} titleClassName="font-bold" />
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Card className="px-6 py-8">
          <WaveScheduleChart
            schedule={waveSchedule}
            trainingMaxes={{ squat: profile.squat_max, bench: profile.bench_max, deadlift: profile.deadlift_max }}
            unit={profile.unit_preference || 'lb'}
            currentWeekIndex={currentBlockIndex}
          />
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">Wave</p>
              <IconButton
                size="sm"
                label="About this phase"
                onClick={() => setShowPhaseInfo(v => !v)}
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="mb-2">
              <span className="text-4xl font-black tabular-nums leading-none text-gray-900 dark:text-gray-100">
                {displayWave}
              </span>
              <span className="text-sm font-semibold text-gray-400 dark:text-gray-400 ml-1">rep</span>
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {PHASE_LABELS[displayPhase]}
            </p>
            {showPhaseInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {PHASE_DESCRIPTIONS[displayPhase]}
              </p>
            )}
          </Card>

          <Card className="p-5">
            {profile.meet_date ? (
              <>
                <div style={{'height': '26px'}} className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">Days Out</p>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-black tabular-nums leading-none text-gray-900 dark:text-gray-100">
                    {Math.max(0, Math.ceil((new Date(profile.meet_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))}
                  </span>
                  <span className="text-xl font-semibold text-gray-400 dark:text-gray-400 ml-0.5">d</span>
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {PHASE_LABELS[displayPhase]}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-3">Week</p>
                <div className="mb-2">
                  <span className="text-4xl font-black tabular-nums leading-none text-gray-900 dark:text-gray-100">
                    {currentBlock ? currentBlock.weekIndex + 1 : profile.current_week}
                  </span>
                  <span className="text-sm font-semibold text-gray-400 dark:text-gray-400 ml-1">of 4</span>
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {PHASE_LABELS[displayPhase]}
                </p>
              </>
            )}
          </Card>
        </div>

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
        <Card className="px-4 py-3 flex items-center justify-between">
          <IconButton
            label="Previous week"
            onClick={() => setWeekOffset(o => o - 1)}
            disabled={!canGoBack}
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </IconButton>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {displayWave}-Rep {PHASE_LABELS[displayPhase]}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Workouts</h2>
            {isViewing && (
              <span className="text-xs font-semibold text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
                Preview
              </span>
            )}
          </div>
          {isDeload && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4">
              <p className="text-gray-900 dark:text-gray-100 font-semibold mb-1">Deload Week</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Lighter weights, same movements. Complete the sets and move on.</p>
            </div>
          )}
          <div className="space-y-3">
            {workouts.map((workout, index) => {
              const isCompleted = completedWorkouts.has(workout.type);
              const sessionData = workoutData.get(workout.type);
              const projected1RM = sessionData?.calculated_1rm;
              const isUpperDayWorkout = workout.type === 'upper';
              const unit = profile.unit_preference || 'lb';
              const roundTo = unit === 'kg' ? 2.5 : 5;
              const baseWeight = (!isUpperDayWorkout && effectiveBlock && effectiveBlock.phase !== 'peaking' && effectiveBlock.phase !== 'meet_week')
                ? calculateJuggernautSets(effectiveBlock.wave, effectiveBlock.phase, workout.max, unit).weight
                : (!isUpperDayWorkout && effectiveBlock?.phase === 'peaking')
                  ? calculatePeakingSets(effectiveBlock.peakWeek ?? 1, effectiveBlock.totalPeakWeeks ?? 3, workout.max, unit).weight
                  : (!isUpperDayWorkout && !effectiveBlock && viewedManual && workout.max > 0)
                    ? calculateJuggernautSets(CYCLE_TO_WAVE[viewedManual.cycle] ?? 3, WEEK_TO_PHASE[viewedManual.week] ?? 'accumulation', workout.max, unit).weight
                    : null;
              const weightLow = baseWeight !== null ? Math.round(baseWeight * WEIGHT_DISPLAY_RANGE_LOW / roundTo) * roundTo : null;
              const weightHigh = baseWeight !== null ? Math.round(baseWeight * WEIGHT_DISPLAY_RANGE_HIGH / roundTo) * roundTo : null;

              const trailing = !isViewing && isCompleted
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
                  className={`animate-enter ${isViewing
                      ? 'bg-gray-50 dark:bg-gray-700 cursor-default'
                      : isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 hover-scale active-press ripple-container'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 hover-scale active-press ripple-container'
                    }`}
                  leading={
                    <span className="w-7 text-center font-mono text-sm font-bold text-gray-300 dark:text-gray-300 select-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  }
                  trailing={trailing}
                >
                  <p className={`text-xs uppercase tracking-widest font-semibold mb-0.5 ${!isViewing && isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'
                    }`}>
                    {workout.name}
                  </p>
                  {!isViewing && isCompleted ? (
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300 tabular-nums">
                      {projected1RM ? `${Math.round(projected1RM)} ${unit} proj.` : 'Done'}
                    </p>
                  ) : isUpperDayWorkout ? (
                    <p className="text-sm text-gray-500 dark:text-gray-300">Accessory work</p>
                  ) : weightLow !== null && weightHigh !== null ? (
                    <p className="text-xl font-black tabular-nums leading-tight text-gray-900 dark:text-gray-100">
                      {weightLow}–{weightHigh} <span className="text-sm font-medium text-gray-400 dark:text-gray-300">{unit}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-300">—</p>
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
          ) : completedWorkouts.size === 4 ? (
            <Button fullWidth className="mt-4" onClick={() => setShowSkipWeekModal(true)} disabled={skipping}>
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
        title="Move to Next Week"
        description={`Skip to ${nextAdvanceLabel}`}
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {completedWorkouts.size === 4
            ? "You've completed all workouts for this week. Ready to move to the next week?"
            : "You haven't completed all workouts yet. Are you sure you want to skip ahead?"}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowSkipWeekModal(false)}>
            Cancel
          </Button>
          <Button size="md" className="flex-1" onClick={handleSkipWeek}>
            Advance Week
          </Button>
        </div>
      </AccessibleModal>
    </div>
  );
}
