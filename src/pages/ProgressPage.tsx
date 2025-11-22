import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, WorkoutSession } from '../lib/supabase';
import ProgressChart from '../components/ProgressChart';
import { useStaggeredAnimation, useRipple } from '../hooks/useAnimations';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccessoryExercise {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets_data: { reps: string; weight: string }[];
}

type Tab = 'overview' | 'weight' | 'volume' | 'log';

export default function ProgressPage() {
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [accessoryData, setAccessoryData] = useState<{ [sessionId: string]: AccessoryExercise[] }>({});
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const visibleLifts = useStaggeredAnimation(4, 100);
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
      .select('*')
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

  const nonDeloadSessions = sessions.filter(s => s.week !== 4);

  const getLatestMaxForLift = (liftType: string) => {
    const liftSessions = nonDeloadSessions.filter(s => s.lift_type === liftType);
    if (liftSessions.length === 0) return 0;
    return liftSessions[liftSessions.length - 1].calculated_1rm;
  };

  const getMaxChangePercent = (liftType: string, initialMax: number) => {
    const currentMax = getLatestMaxForLift(liftType);
    if (initialMax === 0) return 0;
    return (((currentMax - initialMax) / initialMax) * 100).toFixed(1);
  };

  const getBestWeightForLift = (liftType: string) => {
    const liftSessions = sessions.filter(s => s.lift_type === liftType);
    if (liftSessions.length === 0) return null;

    let bestSession = liftSessions[0];
    liftSessions.forEach(session => {
      if (session.weight_lifted > bestSession.weight_lifted) {
        bestSession = session;
      }
    });

    return bestSession;
  };

  const getBestVolumeForLift = (liftType: string) => {
    const liftSessions = sessions.filter(s => s.lift_type === liftType);
    if (liftSessions.length === 0) return null;

    let bestSession = liftSessions[0];
    let bestTonnage = calculateTonnage(bestSession);

    liftSessions.forEach(session => {
      const tonnage = calculateTonnage(session);
      if (tonnage > bestTonnage) {
        bestSession = session;
        bestTonnage = tonnage;
      }
    });

    return { session: bestSession, tonnage: bestTonnage };
  };

  const lifts = [
    { name: '1RM Squat', displayName: 'Max Squat', type: 'squat', initial: profile.squat_max },
    { name: '1RM Bench', displayName: 'Max Bench', type: 'bench', initial: profile.bench_max },
    { name: '1RM Deadlift', displayName: 'Max Deadlift', type: 'deadlift', initial: profile.deadlift_max },
    { name: '1RM OHP', displayName: 'Max Overhead Press', type: 'ohp', initial: profile.ohp_max },
  ];

  const liftTypes = ['squat', 'bench', 'deadlift', 'ohp'];
  const liftNames = ['Squat', 'Bench', 'Deadlift', 'OHP'];
  const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b'];

  const chartData = liftTypes.map((type, idx) => {
    const liftSessions = nonDeloadSessions.filter(s => s.lift_type === type);
    return {
      type,
      name: liftNames[idx],
      color: colors[idx],
      data: liftSessions.map(s => ({
        value: s.calculated_1rm,
        date: s.completed_at,
      })),
    };
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTonnage = (session: WorkoutSession) => {
    let mainLiftTonnage = session.weight_lifted * session.reps_performed;

    const accessories = accessoryData[session.id] || [];
    const accessoryTonnage = accessories.reduce((total, exercise) => {
      const exerciseTotal = exercise.sets_data.reduce((setTotal, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        return setTotal + (weight * reps);
      }, 0);
      return total + exerciseTotal;
    }, 0);

    return mainLiftTonnage + accessoryTonnage;
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
        const order = ['squat', 'bench', 'deadlift', 'ohp'];
        return order.indexOf(a.lift_type) - order.indexOf(b.lift_type);
      }),
      totalTonnage: sessions.reduce((total, s) => total + calculateTonnage(s), 0)
    }));
  };

  const getLiftDisplayName = (type: string) => {
    const names: { [key: string]: string } = {
      squat: 'Squat',
      bench: 'Benchpress',
      deadlift: 'Deadlift',
      ohp: 'Overhead Press'
    };
    return names[type] || type;
  };

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'weight' as Tab, label: 'Best Weight' },
    { id: 'volume' as Tab, label: 'Best Volume' },
    { id: 'log' as Tab, label: 'Workout Log' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Progress</h1>
          <p className="text-gray-600">Track your strength gains over time</p>
        </div>

        <div className="max-w-md mx-auto px-4">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={(e) => {
                  createRipple(e);
                  setActiveTab(tab.id);
                }}
                className={`flex-1 py-3 font-semibold text-sm transition-all ripple-container relative overflow-hidden whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {nonDeloadSessions.length === 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 animate-fade-in">
                <p className="text-gray-700 font-semibold mb-1">Start tracking your progress!</p>
                <p className="text-sm text-gray-600">Complete your first workout to see your progress here.</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Estimated 1RM Over Time</h2>
              <p className="text-xs text-gray-500 mb-4">Based on your AMRAP set performance each week</p>
              {nonDeloadSessions.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <p className="text-gray-600 mb-2">Complete your first workout to see progress</p>
                  <p className="text-sm text-gray-500">Your strength trend will appear here after completing workouts</p>
                </div>
              ) : (
                <ProgressChart chartData={chartData} unitPreference={profile.unit_preference || 'lb'} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {lifts.map((lift, index) => {
                const currentMax = getLatestMaxForLift(lift.type) || lift.initial;
                const changePercent = parseFloat(getMaxChangePercent(lift.type, lift.initial));
                const hasData = nonDeloadSessions.some(s => s.lift_type === lift.type);
                const isVisible = index < visibleLifts;

                return (
                  <div
                    key={lift.type}
                    className={`bg-white rounded-2xl shadow-sm p-6 hover-lift transition-all ${
                      isVisible ? 'opacity-100 animate-scale-in' : 'opacity-0'
                    }`}
                    style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
                  >
                    <p className="text-gray-600 text-sm mb-2">{lift.name}</p>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {currentMax} {profile.unit_preference || 'lb'}
                    </div>
                    {hasData ? (
                      <div className={`text-sm font-semibold animate-fade-in ${
                        changePercent > 0 ? 'text-green-600' :
                        changePercent < 0 ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {changePercent > 0 && '+'}({changePercent}%)
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No change</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'weight' && (
          <div className="space-y-4">
            {lifts.map((lift, index) => {
              const bestSession = getBestWeightForLift(lift.type);

              return (
                <div
                  key={lift.type}
                  className="bg-white rounded-2xl shadow-sm p-6 animate-slide-up hover-lift"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-gray-700 font-medium">{lift.displayName}</p>
                    {bestSession && (
                      <p className="text-sm text-gray-500">
                        {formatDate(bestSession.completed_at).split(',')[0]}, {new Date(bestSession.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {bestSession ? (
                    <>
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        {bestSession.weight_lifted} {profile.unit_preference || 'lb'}
                      </div>
                      <p className="text-sm text-gray-600">{bestSession.reps_performed} reps</p>
                    </>
                  ) : (
                    <div className="text-gray-500 py-2">No workouts recorded</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'volume' && (
          <div className="space-y-4">
            {lifts.map((lift, index) => {
              const bestVolume = getBestVolumeForLift(lift.type);

              return (
                <div
                  key={lift.type}
                  className="bg-white rounded-2xl shadow-sm p-6 animate-slide-up hover-lift"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-gray-700 font-medium">{lift.displayName}</p>
                    {bestVolume && (
                      <p className="text-sm text-gray-500">
                        {formatDate(bestVolume.session.completed_at).split(',')[0]}, {new Date(bestVolume.session.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {bestVolume ? (
                    <>
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        {bestVolume.tonnage.toLocaleString()} {profile.unit_preference || 'lb'}
                      </div>
                      <p className="text-sm text-gray-600">
                        Main: {bestVolume.session.reps_performed} × {bestVolume.session.weight_lifted}{profile.unit_preference || 'lb'}
                      </p>
                      {accessoryData[bestVolume.session.id]?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          + {accessoryData[bestVolume.session.id].length} accessory {accessoryData[bestVolume.session.id].length === 1 ? 'exercise' : 'exercises'}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500 py-2">No workouts recorded</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4">
            {groupSessionsByDate().map((group, index) => (
              <div
                key={group.date}
                className="bg-white rounded-2xl shadow-sm p-6 animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-gray-700 font-medium">
                      {formatDate(group.sessions[0].completed_at)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Week {group.sessions[0].week}, Cycle {group.sessions[0].cycle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Total Tonnage:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {group.totalTonnage.toLocaleString()} {profile.unit_preference || 'lb'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {group.sessions.map((session) => {
                    const hasAccessories = accessoryData[session.id]?.length > 0;
                    const isExpanded = expandedSessions.has(session.id);

                    return (
                      <div key={session.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-700 font-medium">{getLiftDisplayName(session.lift_type)}</p>
                          <p className="text-gray-900 font-semibold">
                            {session.reps_performed} x {session.weight_lifted}{profile.unit_preference || 'lb'}
                          </p>
                        </div>
                        {hasAccessories && (
                          <>
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedSessions);
                                if (isExpanded) {
                                  newExpanded.delete(session.id);
                                } else {
                                  newExpanded.add(session.id);
                                }
                                setExpandedSessions(newExpanded);
                              }}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  Hide Accessories <ChevronUp className="w-4 h-4" />
                                </>
                              ) : (
                                <>
                                  Show Accessories <ChevronDown className="w-4 h-4" />
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200 animate-slide-in-bottom">
                                {accessoryData[session.id].map((exercise) => (
                                  <div key={exercise.id} className="text-sm">
                                    <p className="font-medium text-gray-700 mb-1">{exercise.exercise_name}</p>
                                    <div className="space-y-1">
                                      {exercise.sets_data.map((set, idx) => (
                                        <p key={idx} className="text-gray-600">
                                          Set {idx + 1}: {set.reps} reps × {set.weight || '0'}{profile.unit_preference || 'lb'}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 animate-fade-in">
                <p className="text-gray-700 font-semibold mb-1">No workouts logged yet</p>
                <p className="text-sm text-gray-600">Complete your first workout to see it here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
