import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateWorkoutWeights, getWeekSubtext, getGreeting, calculateWilksScore, getCycleProgression } from '../../lib/calculations';
import { Calendar, RefreshCw, ChevronRight, ChevronDown, Check, SkipForward, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCountUp, useRipple } from '../../hooks/useAnimations';
import OneRepMaxTest from '../../components/features/OneRepMaxTest';
import AccessibleProgressRing from '../../components/accessible/AccessibleProgressRing';
import AccessibleModal from '../../components/accessible/AccessibleModal';

interface HomePageProps {
  onNavigate: (page: string, liftType?: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [workoutData, setWorkoutData] = useState<Map<string, { calculated_1rm: number }>>(new Map());
  const [projectedMaxes, setProjectedMaxes] = useState<{ squat: number; bench: number; deadlift: number; ohp: number }>({ squat: 0, bench: 0, deadlift: 0, ohp: 0 });
  const [initialMaxes, setInitialMaxes] = useState<{ squat: number; bench: number; deadlift: number; ohp: number }>({ squat: 0, bench: 0, deadlift: 0, ohp: 0 });
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
      .select('lift_type, calculated_1rm, week, cycle, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true });

    if (data) {
      const getLatestMax = (liftType: string) => {
        const liftSessions = data.filter(s => s.lift_type === liftType && s.week !== 4);
        if (liftSessions.length === 0) return 0;
        return liftSessions[liftSessions.length - 1].calculated_1rm;
      };

      const getInitialMax = (liftType: string) => {
        const initialSession = data.find(s => s.lift_type === liftType && s.cycle === 0 && s.week === 0);
        if (initialSession) return initialSession.calculated_1rm;
        return 0;
      };

      console.log( getInitialMax('squat'))

      setProjectedMaxes({
        squat: getLatestMax('squat') || profile.squat_max,
        bench: getLatestMax('bench') || profile.bench_max,
        deadlift: getLatestMax('deadlift') || profile.deadlift_max,
        ohp: getLatestMax('ohp') || profile.ohp_max,
      });

      setInitialMaxes({
        squat: getInitialMax('squat') || profile.squat_max,
        bench: getInitialMax('bench') || profile.bench_max,
        deadlift: getInitialMax('deadlift') || profile.deadlift_max,
        ohp: getInitialMax('ohp') || profile.ohp_max,
      });
    }
  };

  const handleWeekChange = async (newWeek: number) => {
    if (!user || !profile) return;

    await supabase
      .from('user_profiles')
      .update({
        current_week: newWeek,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await refreshProfile();
    setShowWeekSelector(false);
  };

  const handleCycleChange = async (newCycle: number) => {
    if (!user || !profile) return;

    await supabase
      .from('user_profiles')
      .update({
        current_cycle: newCycle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await refreshProfile();
    setShowCycleSelector(false);
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

  const workouts = [
    { name: 'Squat', max: profile.squat_max, type: 'squat' },
    { name: 'Bench', max: profile.bench_max, type: 'bench' },
    { name: 'Deadlift', max: profile.deadlift_max, type: 'deadlift' },
    { name: 'Overhead Press', max: profile.ohp_max, type: 'ohp' },
  ];

  const isLbs = profile.unit_preference === 'lb';
  const lbToKg = (weight: number) => isLbs ? weight * 0.453592 : weight;

  const initialWilksScore = calculateWilksScore(
    lbToKg(initialMaxes.squat),
    lbToKg(initialMaxes.bench),
    lbToKg(initialMaxes.deadlift),
    lbToKg(profile.bodyweight || 0),
    profile.gender || 'male'
  );

  const projectedWilksScore = calculateWilksScore(
    lbToKg(projectedMaxes.squat),
    lbToKg(projectedMaxes.bench),
    lbToKg(projectedMaxes.deadlift),
    lbToKg(profile.bodyweight || 0),
    profile.gender || 'male'
  );

  const wilksChangePercent = initialWilksScore > 0
    ? (((projectedWilksScore - initialWilksScore) / initialWilksScore) * 100).toFixed(1)
    : '0.0';

  const hasProjectedData = projectedMaxes.squat > 0 || projectedMaxes.bench > 0 || projectedMaxes.deadlift > 0;
  const displayWilks = hasProjectedData ? projectedWilksScore : initialWilksScore;

  const getWilksLevel = (score: number): string => {
    if (score < 200) return 'Beginner';
    if (score < 238) return 'Novice';
    if (score < 326) return 'Intermediate';
    if (score < 414) return 'Advanced';
    return 'Elite';
  };

  const progression = getCycleProgression(profile.current_cycle, 'squat');
  const animatedWilks = useCountUp(displayWilks, 1500, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1 animate-slide-in-left">{getGreeting()}</h1>
          <p className="text-gray-600 dark:text-gray-300 animate-slide-in-left stagger-1">Are you ready to lift heavy?</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-900 dark:text-gray-100 text-sm font-semibold">Wilks Score</p>
              <p className="text-xs text-gray-500 dark:text-gray-300">Strength normalized by bodyweight</p>
            </div>
            {hasProjectedData && parseFloat(wilksChangePercent) !== 0 && (
              <div className={`text-sm font-semibold ${
                parseFloat(wilksChangePercent) > 0 ? 'text-green-600' :
                parseFloat(wilksChangePercent) < 0 ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {parseFloat(wilksChangePercent) > 0 && '+'}({wilksChangePercent}%)
              </div>
            )}
          </div>
          <div className="flex items-center justify-center mb-4">
            <AccessibleProgressRing
              value={displayWilks}
              max={600}
              label="Wilks Score"
              description={`${getWilksLevel(displayWilks)}${hasProjectedData ? ' (Projected)' : ''}`}
              size={192}
              showValue={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative group">
            <label htmlFor="week-selector" className="sr-only">
              Select training week
            </label>
            <select
              id="week-selector"
              value={profile.current_week}
              onChange={(e) => handleWeekChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
              <option value={1}>Week 1 - 5 reps</option>
              <option value={2}>Week 2 - 3 reps</option>
              <option value={3}>Week 3 - 5-3-1</option>
              <option value={4}>Week 4 - Deload</option>
            </select>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 group-hover:shadow-md transition-all group-focus-within:ring-2 group-focus-within:ring-blue-500 group-focus-within:ring-offset-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-0.5">Week</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{profile.current_week}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{getWeekSubtext(profile.current_week)}</div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-300 flex-shrink-0" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="relative group">
            <label htmlFor="cycle-selector" className="sr-only">
              Select training cycle
            </label>
            <select
              id="cycle-selector"
              value={profile.current_cycle}
              onChange={(e) => handleCycleChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Cycle {i + 1} - +{getCycleProgression(i + 1)} lbs
                </option>
              ))}
            </select>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 group-hover:shadow-md transition-all group-focus-within:ring-2 group-focus-within:ring-blue-500 group-focus-within:ring-offset-2">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-10 h-10 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-0.5">Cycle</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{profile.current_cycle}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">+{progression} lbs</div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-300 flex-shrink-0" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowOneRMTest(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-all hover-lift"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-lg mb-1">Test Your 1 Rep Max</p>
              <p className="text-sm text-blue-100">Update your training maxes with guided testing protocol</p>
            </div>
            <ChevronRight className="w-6 h-6" />
          </div>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Workouts</h2>
            <button
              onClick={() => setShowSkipWeekModal(true)}
              disabled={skipping}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4" />
              Move to Next Week
            </button>
          </div>
          {profile.current_week === 4 && (
            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 mb-4">
              <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">Deload Week - Active Recovery</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Complete your workouts at lighter weights. No need to log your reps this week!</p>
            </div>
          )}
          <div className="space-y-3">
            {workouts.map((workout) => {
              const weights = calculateWorkoutWeights(
                workout.type,
                workout.max,
                profile.current_cycle,
                profile.current_week
              );
              const isCompleted = completedWorkouts.has(workout.type);
              const sessionData = workoutData.get(workout.type);
              const projected1RM = sessionData?.calculated_1rm;

              const isDeloadWeek = profile.current_week === 4;

              return (
                <button
                  key={workout.type}
                  onClick={(e) => {
                    if (!isCompleted) {
                      createRipple(e);
                      onNavigate('workout', workout.type);
                    }
                  }}
                  disabled={isCompleted}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors hover-scale active-press ripple-container ${
                    isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="text-left">
                    <div className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {workout.name}
                    </div>
                    <div className={`text-sm ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {isCompleted && projected1RM
                        ? `Projected 1RM: ${Math.round(projected1RM)} ${profile.unit_preference || 'lb'}`
                        : isCompleted
                        ? 'Done ✓'
                        : `Top set: ${weights.set3} ${profile.unit_preference || 'lb'}`}
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
            Continue
          </button>
        </div>
      </AccessibleModal>
    </div>
  );
}
