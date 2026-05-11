import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateWorkoutWeights, getGreeting, calculateWilksScore, calculateWilks2Score, calculateDOTSScore, calculateIPFGLScore, buildWaveSchedule, WeekBlock } from '../../lib/calculations';
import { Calendar, RefreshCw, ChevronRight, Check, Activity, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRipple } from '../../hooks/useAnimations';
import OneRepMaxTest from '../../components/features/OneRepMaxTest';
import StrengthScoreCarousel from '../../components/features/StrengthScoreCarousel';
import AccessibleModal from '../../components/accessible/AccessibleModal';
import { getAverageOfLastThreeSessions, getBestWeightForLift, getFirstRecordedMax } from '../Progress/utils';

interface HomePageProps {
  onNavigate: (page: string, liftType?: string) => void;
}

const WAVE_LABELS: Record<number, string> = { 10: '10-Rep', 8: '8-Rep', 5: '5-Rep', 3: '3-Rep' };
const PHASE_LABELS: Record<string, string> = {
  accumulation: 'Accumulation',
  intensification: 'Intensification',
  realization: 'Realization',
  deload: 'Deload',
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
  const [projectedMaxes, setProjectedMaxes] = useState<{ squat: number; bench: number; deadlift: number }>({ squat: 0, bench: 0, deadlift: 0 });
  const [bestMaxes, setBestMaxes] = useState<{ squat: number; bench: number; deadlift: number }>({ squat: 0, bench: 0, deadlift: 0 });
  const [initialMaxes, setInitialMaxes] = useState<{ squat: number; bench: number; deadlift: number }>({ squat: 0, bench: 0, deadlift: 0 });
  const [skipping, setSkipping] = useState(false);
  const [showOneRMTest, setShowOneRMTest] = useState(false);
  const [showSkipWeekModal, setShowSkipWeekModal] = useState(false);
  const createRipple = useRipple();

  useEffect(() => {
    if (user && profile) {
      loadCompletedWorkouts();
      loadProjectedMaxes();
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

  const loadProjectedMaxes = async () => {
    if (!user || !profile) return;

    const { data } = await supabase
      .from('workout_sessions')
      .select('id, user_id, lift_type, cycle, week, weight_lifted, reps_performed, calculated_1rm, completed_at, created_at, is_1rm_test, notes')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true });

    if (data) {
      const projected = {
        squat: getAverageOfLastThreeSessions(data, 'squat') || profile.squat_max,
        bench: getAverageOfLastThreeSessions(data, 'bench') || profile.bench_max,
        deadlift: getAverageOfLastThreeSessions(data, 'deadlift') || profile.deadlift_max,
      };

      const best = {
        squat: getBestWeightForLift(data, 'squat')?.weight_lifted || profile.squat_max,
        bench: getBestWeightForLift(data, 'bench')?.weight_lifted || profile.bench_max,
        deadlift: getBestWeightForLift(data, 'deadlift')?.weight_lifted || profile.deadlift_max,
      };

      setProjectedMaxes(projected);
      setBestMaxes(best);

      setInitialMaxes({
        squat: getFirstRecordedMax(data, 'squat') || profile.squat_max,
        bench: getFirstRecordedMax(data, 'bench') || profile.bench_max,
        deadlift: getFirstRecordedMax(data, 'deadlift') || profile.deadlift_max,
      });
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
  const isDeload = currentBlock ? currentBlock.phase === 'deload' : profile.current_week === 4;

  const workouts = [
    { name: 'Squat', max: profile.squat_max, type: 'squat' },
    { name: 'Upper', max: 0, type: 'upper' },
    { name: 'Deadlift', max: profile.deadlift_max, type: 'deadlift' },
    { name: 'Bench', max: profile.bench_max, type: 'bench' },
  ];

  const isLbs = profile.unit_preference === 'lb';
  const lbToKg = (weight: number) => isLbs ? weight * 0.453592 : weight;

  const initialScores = {
    wilks: calculateWilksScore(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
    wilks2: calculateWilks2Score(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
    dots: calculateDOTSScore(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
    ipfgl: calculateIPFGLScore(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
  };

  const effectiveMaxes = {
    squat: Math.max(projectedMaxes.squat, bestMaxes.squat),
    bench: Math.max(projectedMaxes.bench, bestMaxes.bench),
    deadlift: Math.max(projectedMaxes.deadlift, bestMaxes.deadlift),
  };

  const projectedScores = {
    wilks: calculateWilksScore(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
    wilks2: calculateWilks2Score(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
    dots: calculateDOTSScore(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
    ipfgl: calculateIPFGLScore(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(profile.bodyweight || 0), profile.gender || 'male'),
  };

  const hasProjectedData = projectedMaxes.squat > 0 || projectedMaxes.bench > 0 || projectedMaxes.deadlift > 0;

  const changePercents = {
    wilks: initialScores.wilks > 0 ? (((projectedScores.wilks - initialScores.wilks) / initialScores.wilks) * 100).toFixed(1) : '0.0',
    wilks2: initialScores.wilks2 > 0 ? (((projectedScores.wilks2 - initialScores.wilks2) / initialScores.wilks2) * 100).toFixed(1) : '0.0',
    dots: initialScores.dots > 0 ? (((projectedScores.dots - initialScores.dots) / initialScores.dots) * 100).toFixed(1) : '0.0',
    ipfgl: initialScores.ipfgl > 0 ? (((projectedScores.ipfgl - initialScores.ipfgl) / initialScores.ipfgl) * 100).toFixed(1) : '0.0',
  };

  const displayScores = hasProjectedData ? projectedScores : initialScores;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 animate-slide-in-left">{getGreeting()}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <StrengthScoreCarousel
          scores={displayScores}
          changePercents={changePercents}
          hasProjectedData={hasProjectedData}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Layers className="w-10 h-10 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-0.5">Wave</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currentBlock ? WAVE_LABELS[currentBlock.wave] : `Week ${profile.current_week}`}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {currentBlock ? `${currentBlock.wave} reps` : `Cycle ${profile.current_cycle}`}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                {profile.meet_date ? (
                  <>
                    <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-0.5">Meet</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {Math.max(0, Math.ceil((new Date(profile.meet_date).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))}w
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentBlock ? PHASE_LABELS[currentBlock.phase] : (isDeload ? 'Deload' : 'Training')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-0.5">Phase</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {currentBlock ? PHASE_LABELS[currentBlock.phase] : (isDeload ? 'Deload' : 'Training')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {isMeetDay && (
          <button
            onClick={() => setShowOneRMTest(true)}
            className="w-full bg-blue-700 dark:bg-blue-600 text-white rounded-2xl shadow-sm p-6 hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors hover-lift"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-lg mb-1">Meet Day — Log Attempts</p>
                <p className="text-sm text-blue-100">Guided warm-up and attempt logging for your lifts</p>
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
            {workouts.map((workout) => {
              const isCompleted = completedWorkouts.has(workout.type);
              const sessionData = workoutData.get(workout.type);
              const projected1RM = sessionData?.calculated_1rm;
              const isUpperDay = workout.type === 'upper';

              let subtitleText: string;
              if (isCompleted && projected1RM) {
                subtitleText = `Projected 1RM: ${Math.round(projected1RM)} ${profile.unit_preference || 'lb'}`;
              } else if (isCompleted) {
                subtitleText = 'Done ✓';
              } else if (isUpperDay) {
                subtitleText = 'Bench accessory work';
              } else {
                const weights = calculateWorkoutWeights(
                  workout.type,
                  workout.max,
                  profile.current_cycle,
                  profile.current_week,
                  profile.unit_preference || 'lb'
                );
                subtitleText = `Top set: ${weights.set3} ${profile.unit_preference || 'lb'}`;
              }

              return (
                <button
                  key={workout.type}
                  onClick={(e) => {
                    createRipple(e);
                    onNavigate('workout', workout.type);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors hover-scale active-press ripple-container ${isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                >
                  <div className="text-left flex-1">
                    <div className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {workout.name}
                    </div>
                    <div className={`text-sm ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {subtitleText}
                    </div>
                  </div>
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
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
            loadProjectedMaxes();
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
