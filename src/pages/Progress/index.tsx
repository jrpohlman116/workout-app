import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, WorkoutSession } from '../../lib/supabase';
import ProgressChart from './ProgressChart';
import AccessibleChartTable from '../../components/accessible/AccessibleChartTable';
import { useStaggeredAnimation, useRipple } from '../../hooks/useAnimations';
import LiftSummaryCard from './LiftSummaryCard';
import TabNavigation from './TabNavigation';
import WorkoutLogEntry from './WorkoutLogEntry';
import * as utils from './utils';

interface AccessoryExercise {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets_data: { reps: string; weight: string }[];
  workout_session_id: string;
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
      .select('id, user_id, lift_type, cycle, week, weight_lifted, reps_performed, calculated_1rm, completed_at, created_at, is_1rm_test, notes')
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
        const order = ['squat', 'bench', 'deadlift', 'ohp'];
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">Progress</h1>
          <p className="text-gray-600 dark:text-gray-300">Track your strength gains over time</p>
        </div>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} onRipple={createRipple} />
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {nonDeloadSessions.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-500 rounded-xl p-4">
                <p className="text-gray-900 dark:text-gray-100 font-semibold mb-1">Start tracking your progress!</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Complete your first workout to see your progress here.</p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Estimated 1RM Over Time</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Based on your AMRAP set performance each week</p>
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

            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Average Projected 1RM</h2>
            <div className="grid grid-cols-2 gap-4">
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

        {activeTab === 'weight' && (
          <div className="space-y-4">
            {lifts.map((lift, index) => {
              const bestSession = utils.getBestWeightForLift(sessions, lift.type);

              return (
                <div key={lift.type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{lift.displayName}</p>
                    {bestSession && <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(bestSession.completed_at)}</p>}
                  </div>
                  {bestSession ? (
                    <>
                      <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {bestSession.weight_lifted} {profile.unit_preference || 'lb'}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">for {bestSession.reps_performed} reps</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Est. 1RM: {Math.round(bestSession.calculated_1rm)} {profile.unit_preference || 'lb'}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No data yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'volume' && (
          <div className="space-y-4">
            {lifts.map((lift, index) => {
              const bestVolume = utils.getBestVolumeForLift(sessions, lift.type);

              return (
                <div key={lift.type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">{lift.displayName}</p>
                    {bestVolume && <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(bestVolume.session.completed_at)}</p>}
                  </div>
                  {bestVolume ? (
                    <>
                      <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">{bestVolume.tonnage.toLocaleString()} {profile.unit_preference || 'lb'}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {bestVolume.session.weight_lifted} {profile.unit_preference || 'lb'} × {bestVolume.session.reps_performed} reps
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No data yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4">
            {groupSessionsByDate().map(group => (
              <div key={group.date}>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">{formatDate(group.date + 'T00:00:00')}</h3>
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
