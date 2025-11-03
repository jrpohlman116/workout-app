import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { calculateWorkoutWeights, getWeekSubtext, getGreeting, calculateWilksScore, getCycleProgression } from '../lib/calculations';
import { Calendar, RefreshCw, ChevronRight, Check, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCountUp, useRipple } from '../hooks/useAnimations';

interface HomePageProps {
  onNavigate: (page: string, liftType?: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [workoutData, setWorkoutData] = useState<Map<string, { calculated_1rm: number }>>(new Map());
  const [projectedMaxes, setProjectedMaxes] = useState<{ squat: number; bench: number; deadlift: number; ohp: number }>({ squat: 0, bench: 0, deadlift: 0, ohp: 0 });
  const [skipping, setSkipping] = useState(false);
  const createRipple = useRipple();

  useEffect(() => {
    if (user && profile) {
      loadCompletedWorkouts();
      loadProjectedMaxes();
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

  const loadProjectedMaxes = async () => {
    if (!user || !profile) return;

    const { data } = await supabase
      .from('workout_sessions')
      .select('lift_type, calculated_1rm, week')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true });

    if (data) {
      const getLatestMax = (liftType: string) => {
        const liftSessions = data.filter(s => s.lift_type === liftType && s.week !== 4);
        if (liftSessions.length === 0) return 0;
        return liftSessions[liftSessions.length - 1].calculated_1rm;
      };

      setProjectedMaxes({
        squat: getLatestMax('squat') || profile.squat_max,
        bench: getLatestMax('bench') || profile.bench_max,
        deadlift: getLatestMax('deadlift') || profile.deadlift_max,
        ohp: getLatestMax('ohp') || profile.ohp_max,
      });
    }
  };

  const handleSkipWeek = async () => {
    if (!user || !profile) return;

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

  const currentWilksScore = calculateWilksScore(
    lbToKg(profile.squat_max),
    lbToKg(profile.bench_max),
    lbToKg(profile.deadlift_max),
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

  const wilksChangePercent = currentWilksScore > 0
    ? (((projectedWilksScore - currentWilksScore) / currentWilksScore) * 100).toFixed(1)
    : '0.0';

  const hasProjectedData = projectedMaxes.squat > 0 || projectedMaxes.bench > 0 || projectedMaxes.deadlift > 0;
  const displayWilks = hasProjectedData ? projectedWilksScore : currentWilksScore;

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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1 animate-slide-in-left">{getGreeting()}</h1>
          <p className="text-gray-600 animate-slide-in-left stagger-1">Are you ready to lift heavy?</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm">Wilks Score</p>
              <p className="text-xs text-gray-500">Strength normalized by bodyweight</p>
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
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="80"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="16"
              />
              <circle
                cx="96"
                cy="96"
                r="80"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="16"
                strokeDasharray={`${(displayWilks / 600) * 502.4} 502.4`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 animate-count-up">{animatedWilks}</div>
                <div className="text-sm text-gray-600 mt-1">{getWilksLevel(displayWilks)}</div>
                {hasProjectedData && (
                  <div className="text-xs text-gray-500 mt-1">Projected</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-600 text-sm mb-2">Week</p>
            <div className="flex items-center gap-3">
              <Calendar className="w-10 h-10 text-blue-600" />
              <div>
                <div className="text-3xl font-bold text-gray-900">{profile.current_week}</div>
                <div className="text-sm text-gray-600">{getWeekSubtext(profile.current_week)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-600 text-sm mb-2">Current Cycle</p>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-10 h-10 text-blue-600" />
              <div>
                <div className="text-3xl font-bold text-gray-900">{profile.current_cycle}</div>
                <div className="text-sm text-gray-600">+{progression} lbs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Workouts</h2>
            <button
              onClick={handleSkipWeek}
              disabled={skipping}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4" />
              Move to Next Week
            </button>
          </div>
          {profile.current_week === 4 && (
            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 mb-4">
              <p className="text-gray-700 font-semibold mb-1">Deload Week - Active Recovery</p>
              <p className="text-sm text-gray-600">Complete your workouts at lighter weights. No need to log your reps this week!</p>
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
                      ? 'bg-green-50 cursor-not-allowed'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-left">
                    <div className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                      {workout.name}
                    </div>
                    <div className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
                      {isCompleted && projected1RM
                        ? `Projected 1RM: ${Math.round(projected1RM)} ${profile.unit_preference || 'lb'}`
                        : isCompleted
                        ? 'Done ✓'
                        : `Top set: ${weights.set3} ${profile.unit_preference || 'lb'}`}
                    </div>
                  </div>
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>
          {completedWorkouts.size === 4 && (
            <button
              onClick={handleSkipWeek}
              disabled={skipping}
              className="w-full mt-4 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {skipping ? 'Advancing your program...' : `Start Week ${profile.current_week === 4 ? 1 : profile.current_week + 1}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
