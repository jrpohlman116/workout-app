import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateWorkoutWeights, calculateJuggernautSets, calculateTrainingMax, getGreeting, buildWaveSchedule, WeekBlock } from '../../lib/calculations';
import { ChevronRight, Check, Activity, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRipple } from '../../hooks/useAnimations';
import OneRepMaxTest from '../../components/features/OneRepMaxTest';
import AccessibleModal from '../../components/accessible/AccessibleModal';
import WaveScheduleChart from '../Progress/WaveScheduleChart';

interface HomePageProps {
  onNavigate: (page: string, liftType?: string) => void;
}

const PHASE_LABELS: Record<string, string> = {
  accumulation: 'Accumulation',
  intensification: 'Intensification',
  realization: 'Realization',
  deload: 'Deload',
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  accumulation: 'High volume, moderate intensity. Complete every rep — you\'re building your base.',
  intensification: 'Less volume, heavier loads. Push the weights and keep technique solid.',
  realization: 'Peak intensity. Your top set is max reps — stop 1 rep before failure.',
  deload: 'Reduced load. Complete all sets without grinding. This is a recovery week.',
};

function getCurrentWeekBlock(programStartDate: string | undefined, meetDate: string | undefined): WeekBlock | null {
  if (!programStartDate || !meetDate) return null;
  const start = new Date(programStartDate);
  const meet = new Date(meetDate);
  const schedule = buildWaveSchedule(start, meet);
  const now = Date.now();
  return schedule.weeks.find(w => w.startDate.getTime() <= now && w.endDate.getTime() >= now) ?? null;
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

  useEffect(() => {
    if (user && profile) {
      loadCompletedWorkouts();
    }
  }, [user, profile?.current_cycle, profile?.current_week]);

  const loadCompletedWorkouts = async () => {
    if (!user || !profile) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data } = await supabase
      .from('workout_sessions')
      .select('lift_type, calculated_1rm')
      .eq('user_id', user.id)
      .eq('cycle', profile.current_cycle)
      .eq('week', profile.current_week)
      .gte('completed_at', todayISO);

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

      await supabase
        .from('user_profiles')
        .update({
          current_week: nextWeek,
          current_cycle: nextCycle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await refreshProfile();
    } catch (error) {
      console.error('Error skipping week:', error);
    } finally {
      setSkipping(false);
    }
  };

  if (!profile) return null;

  const isMeetDay = (() => {
    if (!profile.meet_date) return false;
    const meet = new Date(profile.meet_date);
    const now = new Date();
    const diffMs = meet.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 1;
  })();

  const currentBlock = getCurrentWeekBlock(profile.program_start_date, profile.meet_date);

  const CYCLE_TO_WAVE: Record<number, number> = { 1: 10, 2: 8, 3: 5, 4: 3 };
  const WEEK_TO_PHASE: Record<number, string> = { 1: 'accumulation', 2: 'intensification', 3: 'realization', 4: 'deload' };
  const displayWave = currentBlock ? currentBlock.wave : (CYCLE_TO_WAVE[profile.current_cycle] ?? 3);
  const displayPhase = currentBlock ? currentBlock.phase : (WEEK_TO_PHASE[profile.current_week] ?? 'deload');

  const isDeload = displayPhase === 'deload';

  const workouts = [
    { name: 'Squat', max: profile.squat_max, type: 'squat' },
    { name: 'Upper', max: 0, type: 'upper' },
    { name: 'Deadlift', max: profile.deadlift_max, type: 'deadlift' },
    { name: 'Bench', max: profile.bench_max, type: 'bench' },
  ];

  const waveSchedule = (profile.program_start_date && profile.meet_date)
    ? buildWaveSchedule(new Date(profile.program_start_date), new Date(profile.meet_date))
    : { weeks: [], adjustments: [], skippedWaves: [], totalWeeks: 0, peakWeekIndex: -1 };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-1">Ironform</p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 animate-slide-in-left">{getGreeting()}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-6 py-8">
          <WaveScheduleChart
            schedule={waveSchedule}
            trainingMax={calculateTrainingMax(profile.squat_max)}
            unit={profile.unit_preference || 'lb'}
            sessions={[]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">Wave</p>
              <button
                onClick={() => setShowPhaseInfo(v => !v)}
                aria-label="About this phase"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mb-2">
              <span className="text-4xl font-black tabular-nums leading-none text-gray-900 dark:text-gray-100">
                {displayWave}
              </span>
              <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 ml-1">rep</span>
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {PHASE_LABELS[displayPhase]}
            </p>
            {showPhaseInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {PHASE_DESCRIPTIONS[displayPhase]}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            {profile.meet_date ? (
              <>
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-3">Days Out</p>
                <div className="mb-2">
                  <span className="text-4xl font-black tabular-nums leading-none text-gray-900 dark:text-gray-100">
                    {Math.max(0, Math.ceil((new Date(profile.meet_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))}
                  </span>
                  <span className="text-xl font-semibold text-gray-400 dark:text-gray-500 ml-0.5">d</span>
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
                  <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 ml-1">of 4</span>
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {PHASE_LABELS[displayPhase]}
                </p>
              </>
            )}
          </div>
        </div>

        {isMeetDay && (
          <button
            onClick={() => setShowOneRMTest(true)}
            className="w-full bg-white text-blue-700 rounded-2xl shadow-sm p-6 hover:bg-blue-50 transition-colors hover-lift focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700 dark:focus:ring-offset-blue-900"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 rounded-full p-3">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-lg mb-1">Meet Day — Log Attempts</p>
                <p className="text-sm text-blue-500">Guided warm-up and attempt logging for your lifts</p>
              </div>
              <ChevronRight className="w-6 h-6" />
            </div>
          </button>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Workouts</h2>
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
              const topWeight = !isUpperDayWorkout ? (
                currentBlock
                  ? calculateJuggernautSets(currentBlock.wave, currentBlock.phase, calculateTrainingMax(workout.max), unit).weight
                  : calculateWorkoutWeights(workout.type, workout.max, profile.current_cycle, profile.current_week, unit).set3
              ) : null;

              return (
                <button
                  key={workout.type}
                  onClick={(e) => {
                    createRipple(e);
                    onNavigate('workout', workout.type);
                  }}
                  style={{ animationDelay: `${160 + index * 40}ms` }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors hover-scale active-press ripple-container animate-enter ${
                    isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="w-7 text-center font-mono text-sm font-bold text-gray-300 dark:text-gray-600 flex-shrink-0 select-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-xs uppercase tracking-widest font-semibold mb-0.5 ${
                      isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {workout.name}
                    </p>
                    {isCompleted ? (
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300 tabular-nums">
                        {projected1RM ? `${Math.round(projected1RM)} ${unit} proj.` : 'Done'}
                      </p>
                    ) : isUpperDayWorkout ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Accessory work</p>
                    ) : (
                      <p className="text-xl font-black tabular-nums leading-tight text-gray-900 dark:text-gray-100">
                        {topWeight} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{unit}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-green-500 dark:text-green-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {completedWorkouts.size === 4 && (
            <button
              onClick={() => setShowSkipWeekModal(true)}
              disabled={skipping}
              className="w-full mt-4 bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {skipping ? 'Advancing your program...' : `Start Week ${profile.current_week === 4 ? 1 : profile.current_week + 1}`}
            </button>
          )}
        </div>
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
        description={`Skip to Week ${profile.current_week === 4 ? 1 : profile.current_week + 1}${profile.current_week === 4 ? ` of Cycle ${profile.current_cycle + 1}` : ''}`}
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {completedWorkouts.size === 4
            ? "You've completed all workouts for this week. Ready to move to the next week?"
            : "You haven't completed all workouts yet. Are you sure you want to skip ahead?"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSkipWeekModal(false)}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSkipWeek}
            className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Advance Week
          </button>
        </div>
      </AccessibleModal>
    </div>
  );
}
