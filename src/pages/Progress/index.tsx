import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, WorkoutSession } from '../../lib/supabase';
import { calculateWilksScore, calculateDOTSScore, calculateIPFGLScore } from '../../lib/calculations';
import ProgressChart from './ProgressChart';
import AccessibleChartTable from '../../components/accessible/AccessibleChartTable';
import { useStaggeredAnimation, useRipple } from '../../hooks/useAnimations';
import LiftSummaryCard from './LiftSummaryCard';
import TabNavigation from './TabNavigation';
import WorkoutLogEntry from './WorkoutLogEntry';
import StrengthScoreCarousel from '../../components/features/StrengthScoreCarousel';
import * as utils from './utils';

interface AccessoryExercise {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets_data: { reps: string; weight: string }[];
  workout_session_id: string;
}

type Tab = 'overview' | 'records' | 'log';

export default function ProgressPage() {
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [accessoryData, setAccessoryData] = useState<{ [sessionId: string]: AccessoryExercise[] }>({});
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const visibleLifts = useStaggeredAnimation(3, 100);
  const createRipple = useRipple();

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('workout_sessions')
      .select('id, user_id, lift_type, cycle, week, weight_lifted, reps_performed, calculated_1rm, completed_at, created_at, is_1rm_test, notes, wave, phase, rpe')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true });

    if (data) {
      setSessions(data);

      const sessionIds = data.map(s => s.id);
      const { data: accessories } = await supabase
        .from('accessory_exercises')
        .select('*')
        .in('workout_session_id', sessionIds)
        .order('exercise_order', { ascending: true });

      if (accessories) {
        const grouped: { [sessionId: string]: AccessoryExercise[] } = {};
        accessories.forEach(acc => {
          if (!grouped[acc.workout_session_id]) {
            grouped[acc.workout_session_id] = [];
          }
          grouped[acc.workout_session_id].push(acc);
        });
        setAccessoryData(grouped);
      }
    }
  };

  if (!profile) return null;

  // Filter deloads: use phase if available (new sessions), fall back to week 4 (legacy)
  const nonDeloadSessions = sessions.filter(s => s.phase !== 'deload' && s.week !== 4);

  const isLbs = profile.unit_preference !== 'kg';
  const lbToKg = (w: number) => isLbs ? w * 0.453592 : w;
  const bw = profile.bodyweight || 0;
  const gender = profile.gender || 'male';

  const projectedMaxes = {
    squat: utils.getAverageOfLastThreeSessions(nonDeloadSessions, 'squat') || profile.squat_max,
    bench: utils.getAverageOfLastThreeSessions(nonDeloadSessions, 'bench') || profile.bench_max,
    deadlift: utils.getAverageOfLastThreeSessions(nonDeloadSessions, 'deadlift') || profile.deadlift_max,
  };
  const bestMaxes = {
    squat: utils.getBestWeightForLift(sessions, 'squat')?.weight_lifted || profile.squat_max,
    bench: utils.getBestWeightForLift(sessions, 'bench')?.weight_lifted || profile.bench_max,
    deadlift: utils.getBestWeightForLift(sessions, 'deadlift')?.weight_lifted || profile.deadlift_max,
  };
  const initialMaxes = {
    squat: utils.getFirstRecordedMax(sessions, 'squat') || profile.squat_max,
    bench: utils.getFirstRecordedMax(sessions, 'bench') || profile.bench_max,
    deadlift: utils.getFirstRecordedMax(sessions, 'deadlift') || profile.deadlift_max,
  };
  const effectiveMaxes = {
    squat: Math.max(projectedMaxes.squat, bestMaxes.squat),
    bench: Math.max(projectedMaxes.bench, bestMaxes.bench),
    deadlift: Math.max(projectedMaxes.deadlift, bestMaxes.deadlift),
  };
  const hasProjectedData = projectedMaxes.squat > 0 || projectedMaxes.bench > 0 || projectedMaxes.deadlift > 0;
  const initialScores = {
    wilks: calculateWilksScore(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(bw), gender),
    dots: calculateDOTSScore(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(bw), gender),
    ipfgl: calculateIPFGLScore(lbToKg(initialMaxes.squat), lbToKg(initialMaxes.bench), lbToKg(initialMaxes.deadlift), lbToKg(bw), gender),
  };
  const projectedScores = {
    wilks: calculateWilksScore(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(bw), gender),
    dots: calculateDOTSScore(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(bw), gender),
    ipfgl: calculateIPFGLScore(lbToKg(effectiveMaxes.squat), lbToKg(effectiveMaxes.bench), lbToKg(effectiveMaxes.deadlift), lbToKg(bw), gender),
  };
  const displayScores = hasProjectedData ? projectedScores : initialScores;
  const scoreChangePercents = {
    wilks: initialScores.wilks > 0 ? (((projectedScores.wilks - initialScores.wilks) / initialScores.wilks) * 100).toFixed(1) : '0.0',
    dots: initialScores.dots > 0 ? (((projectedScores.dots - initialScores.dots) / initialScores.dots) * 100).toFixed(1) : '0.0',
    ipfgl: initialScores.ipfgl > 0 ? (((projectedScores.ipfgl - initialScores.ipfgl) / initialScores.ipfgl) * 100).toFixed(1) : '0.0',
  };

  const lifts = [
    { name: '1RM Squat', displayName: 'Max Squat', type: 'squat', initial: profile.squat_max },
    { name: '1RM Bench', displayName: 'Max Bench', type: 'bench', initial: profile.bench_max },
    { name: '1RM Deadlift', displayName: 'Max Deadlift', type: 'deadlift', initial: profile.deadlift_max },
  ];

  const liftTypes = ['squat', 'bench', 'deadlift'];
  const liftNames = ['Squat', 'Bench', 'Deadlift'];
  const colors = ['#2563eb', '#059669', '#4f46e5'];

  const chartData = liftTypes.map((type, idx) => {
    const liftSessions = nonDeloadSessions.filter(s => s.lift_type === type);
    return {
      type,
      name: liftNames[idx],
      color: colors[idx],
      data: liftSessions.map(s => ({
        value: s.calculated_1rm,
        date: s.completed_at,
        cycle: s.cycle,
        week: s.week,
      })),
    };
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupSessionsByDate = () => {
    const grouped: { [key: string]: WorkoutSession[] } = {};

    [...sessions].reverse().forEach(session => {
      const dateKey = session.completed_at.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });

    return Object.entries(grouped).map(([date, sessions]) => ({
      date,
      sessions: sessions.sort((a, b) => {
        const order = ['squat', 'upper', 'deadlift', 'bench'];
        return order.indexOf(a.lift_type) - order.indexOf(b.lift_type);
      }),
    }));
  };

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-1">Juggernaut</p>
          <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 animate-slide-in-left">Progress</h1>
        </div>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} onRipple={createRipple} />
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-enter">
            <StrengthScoreCarousel
              scores={displayScores}
              changePercents={scoreChangePercents}
              hasProjectedData={hasProjectedData}
            />

            {nonDeloadSessions.length === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">No data yet</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Complete your first workout to see your progress here.</p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">Estimated 1RM Over Time</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">AMAP sets, realization weeks only</p>
              {nonDeloadSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">Complete your first workout to see progress</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your strength trend will appear here after completing workouts</p>
                </div>
              ) : (
                <>
                  <ProgressChart chartData={chartData} unitPreference={profile.unit_preference || 'lb'} />
                </>
              )}
            </div>

            {nonDeloadSessions.length > 0 && (
              <AccessibleChartTable chartData={chartData} unitPreference={profile.unit_preference || 'lb'} />
            )}

            <p className="text-xs uppercase tracking-widest font-semibold text-white/70 mb-2">Average Projected 1RM</p>
            <div className="grid grid-cols-3 gap-3">
              {lifts.map((lift, index) => {
                const averageMax = utils.getAverageOfLastThreeSessions(nonDeloadSessions, lift.type);
                const displayMax = averageMax > 0 ? averageMax : lift.initial;
                const firstRecorded = utils.getFirstRecordedMax(sessions, lift.type);
                const changePercent = utils.getMaxChangePercent(sessions, nonDeloadSessions, lift.type);
                const isVisible = index < visibleLifts;

                return (
                  <LiftSummaryCard
                    key={lift.type}
                    name={lift.name}
                    displayName={lift.displayName}
                    current={displayMax}
                    initial={firstRecorded > 0 ? firstRecorded : lift.initial}
                    changePercent={changePercent}
                    isVisible={isVisible}
                    unitPreference={profile.unit_preference || 'lb'}
                  />
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-4 animate-enter">
            {lifts.map((lift, index) => {
              const bestSession = utils.getBestWeightForLift(sessions, lift.type);
              const bestVolume = utils.getBestVolumeForLift(sessions, lift.type);
              const unit = profile.unit_preference || 'lb';

              return (
                <div key={lift.type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-enter" style={{ animationDelay: `${index * 50}ms` }}>
                  <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-4">{lift.displayName}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Best Set</p>
                      {bestSession ? (
                        <>
                          <div className="flex items-baseline gap-1 mb-0.5">
                            <span className="text-3xl font-black tabular-nums text-gray-900 dark:text-gray-100">{bestSession.weight_lifted}</span>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{unit} × {bestSession.reps_performed}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Est. 1RM {Math.round(bestSession.calculated_1rm)} {unit}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(bestSession.completed_at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No data yet</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Best Volume</p>
                      {bestVolume ? (
                        <>
                          <div className="flex items-baseline gap-1 mb-0.5">
                            <span className="text-3xl font-black tabular-nums text-gray-900 dark:text-gray-100">{bestVolume.tonnage.toLocaleString()}</span>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{unit}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{bestVolume.session.weight_lifted} × {bestVolume.session.reps_performed}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(bestVolume.session.completed_at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No data yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4 animate-enter">
            {groupSessionsByDate().map(group => (
              <div key={group.date}>
                <p className="text-xs uppercase tracking-widest font-semibold text-white/70 mb-2 px-1">{formatDate(group.date + 'T00:00:00')}</p>
                <div className="space-y-3">
                  {group.sessions.map(session => (
                    <WorkoutLogEntry
                      key={session.id}
                      session={session}
                      accessories={accessoryData[session.id] || []}
                      isExpanded={expandedSessions.has(session.id)}
                      onToggle={() => toggleSessionExpansion(session.id)}
                      unitPreference={profile.unit_preference || 'lb'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
