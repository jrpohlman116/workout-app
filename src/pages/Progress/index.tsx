import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, WorkoutSession } from '../../lib/supabase';
import { calculateWilksScore, calculateDOTSScore, calculateIPFGLScore } from '../../lib/calculations';
import ProgressChart from './components/ProgressChart';
import AccessibleChartTable from '../../components/accessible/AccessibleChartTable';
import { useStaggeredAnimation, useRipple } from '../../hooks/useAnimations';
import LiftSummaryCard from './components/LiftSummaryCard';
import TabNavigation from './components/TabNavigation';
import WorkoutLogEntry from './components/WorkoutLogEntry';
import StrengthScoreCarousel from '../../components/features/StrengthScoreCarousel';
import PastMeetModal from './components/PastMeetModal';
import type { AccessoryExercise, ProgressTab as Tab, MeetGroup } from '../../lib/types';
import * as utils from './utils';
import { formatDate, calculateStrengthScores } from './utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel from '../../components/ui/SectionLabel';


export default function ProgressPage() {
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [accessoryData, setAccessoryData] = useState<{ [sessionId: string]: AccessoryExercise[] }>({});
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showPastMeetModal, setShowPastMeetModal] = useState(false);
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

  // Filter deloads: use phase if available (new sessions), fall back to week 4 (legacy).
  // Meet/1RM-test attempts are excluded too — they're actual competition singles, not
  // AMAP training projections, and get their own markers on the chart via `meets` below.
  const nonDeloadSessions = sessions.filter(s => s.phase !== 'deload' && s.week !== 4 && !s.is_1rm_test);

  const toKg = (w: number) => profile.unit_preference !== 'kg' ? w * 0.453592 : w;
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

  const { initial: initialScores, projected: projectedScores, changePercents: scoreChangePercents } =
    calculateStrengthScores(initialMaxes, effectiveMaxes, bw, gender, toKg);
  const displayScores = hasProjectedData ? projectedScores : initialScores;

  const lifts = [
    { name: '1RM Squat',    displayName: 'Max Squat',    type: 'squat',    initial: profile.squat_max,    chartName: 'Squat',    color: '#2563eb' },
    { name: '1RM Bench',    displayName: 'Max Bench',    type: 'bench',    initial: profile.bench_max,    chartName: 'Bench',    color: '#059669' },
    { name: '1RM Deadlift', displayName: 'Max Deadlift', type: 'deadlift', initial: profile.deadlift_max, chartName: 'Deadlift', color: '#4f46e5' },
  ];

  const chartData = lifts.map(lift => {
    const liftSessions = nonDeloadSessions.filter(s => s.lift_type === lift.type);
    return {
      type: lift.type,
      name: lift.chartName,
      color: lift.color,
      data: liftSessions.map(s => ({
        value: s.calculated_1rm,
        date: s.completed_at,
        cycle: s.cycle,
        week: s.week,
      })),
    };
  });

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

  const groupMeetsByDate = (): MeetGroup[] => {
    const meetSessions = sessions.filter(s => s.is_1rm_test);
    const grouped: Record<string, WorkoutSession[]> = {};
    meetSessions.forEach(s => {
      const key = s.completed_at.split('T')[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, daySessions]) => {
        const liftOrder = ['squat', 'bench', 'deadlift'];
        const attemptsByLift: Record<string, WorkoutSession[]> = {};
        liftOrder.forEach(lift => {
          attemptsByLift[lift] = daySessions
            .filter(s => s.lift_type === lift)
            .sort((a, b) => a.weight_lifted - b.weight_lifted);
        });

        const bestMade = (lift: string): WorkoutSession | null => {
          const made = attemptsByLift[lift].filter(s => s.reps_performed > 0);
          return made.length > 0 ? made[made.length - 1] : null;
        };

        const bestSquat = bestMade('squat');
        const bestBench = bestMade('bench');
        const bestDeadlift = bestMade('deadlift');

        const total =
          bestSquat && bestBench && bestDeadlift
            ? bestSquat.weight_lifted + bestBench.weight_lifted + bestDeadlift.weight_lifted
            : null;

        return { date, attemptsByLift, bestSquat, bestBench, bestDeadlift, total };
      });
  };

  const meetGroups = groupMeetsByDate();

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Juggernaut" title="Progress" />

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
                <SectionLabel className="mb-1">No data yet</SectionLabel>
                <p className="text-sm text-gray-700 dark:text-gray-300">Complete your first workout to see your progress here.</p>
              </div>
            )}

            <Card className="p-6">
              <SectionLabel className="mb-1">Estimated 1RM Over Time</SectionLabel>
              <p className="text-xs text-gray-400 dark:text-gray-400 mb-4">AMAP sets, realization weeks only</p>
              {nonDeloadSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">Complete your first workout to see progress</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your strength trend will appear here after completing workouts</p>
                </div>
              ) : (
                <>
                  <ProgressChart chartData={chartData} meets={meetGroups} unitPreference={profile.unit_preference || 'lb'} />
                </>
              )}
            </Card>

            {nonDeloadSessions.length > 0 && (
              <AccessibleChartTable chartData={chartData} meets={meetGroups} unitPreference={profile.unit_preference || 'lb'} />
            )}

            <p className="text-xs uppercase tracking-widest font-semibold text-white/70 mb-2">Average Projected 1RM</p>
            <div className="grid grid-rows-3 gap-3">
              {lifts.map((lift, index) => {
                const averageMax = utils.getAverageOfLastThreeSessions(nonDeloadSessions, lift.type);
                const displayMax = averageMax > 0 ? averageMax : lift.initial;
                const firstRecorded = utils.getFirstRecordedMax(sessions, lift.type);
                const changePercent = utils.getMaxChangePercent(sessions, nonDeloadSessions, lift.type);
                const isVisible = index < visibleLifts;

                return (
                  <LiftSummaryCard
                    key={lift.type}
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
                <Card key={lift.type} className="p-6 animate-enter" style={{ animationDelay: `${index * 50}ms` }}>
                  <SectionLabel className="mb-4">{lift.displayName}</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-400 mb-2">Best Set</p>
                      {bestSession ? (
                        <>
                          <div className="flex items-baseline gap-1 mb-0.5">
                            <span className="text-3xl font-black tabular-nums text-gray-900 dark:text-gray-100">{bestSession.weight_lifted}</span>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-400">{unit} × {bestSession.reps_performed}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Est. 1RM {Math.round(bestSession.calculated_1rm)} {unit}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{formatDate(bestSession.completed_at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-400">No data yet</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-400 mb-2">Best Volume</p>
                      {bestVolume ? (
                        <>
                          <div className="flex items-baseline gap-1 mb-0.5">
                            <span className="text-3xl font-black tabular-nums text-gray-900 dark:text-gray-100">{bestVolume.tonnage.toLocaleString()}</span>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-400">{unit}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{bestVolume.session.weight_lifted} × {bestVolume.session.reps_performed}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{formatDate(bestVolume.session.completed_at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-400">No data yet</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4 animate-enter">
            {groupSessionsByDate()
              .map(group => ({
                ...group,
                sessions: group.sessions.filter(s => !s.is_1rm_test),
              }))
              .filter(group => group.sessions.length > 0)
              .map(group => (
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

        {activeTab === 'meets' && (
          <div className="space-y-4 animate-enter">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest font-semibold text-white/70">Meet History</p>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowPastMeetModal(true)}
              >
                Log Meet
              </Button>
            </div>

            {(() => {
              const unit = profile.unit_preference || 'lb';
              const liftLabels: Record<string, string> = {
                squat: 'Squat',
                bench: 'Bench',
                deadlift: 'Deadlift',
              };

              if (meetGroups.length === 0) {
                return (
                  <Card className="p-8 text-center">
                    <SectionLabel className="mb-2">No meets yet</SectionLabel>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Use the Meet Day button on your home screen to log live attempts, or tap <span className="font-semibold">Log Past Meet</span> above to enter a previous competition.
                    </p>
                  </Card>
                );
              }

              return meetGroups.map(meet => {
                const meetScores =
                  meet.total && meet.bestSquat && meet.bestBench && meet.bestDeadlift
                    ? {
                        wilks: calculateWilksScore(
                          toKg(meet.bestSquat.weight_lifted),
                          toKg(meet.bestBench.weight_lifted),
                          toKg(meet.bestDeadlift.weight_lifted),
                          toKg(bw),
                          gender
                        ),
                        dots: calculateDOTSScore(
                          toKg(meet.bestSquat.weight_lifted),
                          toKg(meet.bestBench.weight_lifted),
                          toKg(meet.bestDeadlift.weight_lifted),
                          toKg(bw),
                          gender
                        ),
                        ipfgl: calculateIPFGLScore(
                          toKg(meet.bestSquat.weight_lifted),
                          toKg(meet.bestBench.weight_lifted),
                          toKg(meet.bestDeadlift.weight_lifted),
                          toKg(bw),
                          gender
                        ),
                      }
                    : null;

                return (
                  <Card key={meet.date} className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <SectionLabel className="mb-0.5">Meet</SectionLabel>
                        <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                          {formatDate(meet.date + 'T12:00:00')}
                        </p>
                      </div>
                      {meet.total !== null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400 dark:text-gray-400 mb-0.5">Total</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                              {meet.total.toLocaleString()}
                            </span>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-400">{unit}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Attempts per lift */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {(['squat', 'bench', 'deadlift'] as const).map(lift => (
                        <div key={lift}>
                          <p className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-2">
                            {liftLabels[lift]}
                          </p>
                          <div className="space-y-1.5">
                            {meet.attemptsByLift[lift].length === 0 && (
                              <p className="text-xs text-gray-300 dark:text-gray-400">—</p>
                            )}
                            {meet.attemptsByLift[lift].map(attempt => {
                              const made = attempt.reps_performed > 0;
                              return (
                                <div key={attempt.id} className="flex items-center gap-1.5">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      made ? 'bg-emerald-500' : 'bg-red-400'
                                    }`}
                                  />
                                  <span
                                    className={`text-sm tabular-nums ${
                                      made
                                        ? 'font-bold text-gray-900 dark:text-gray-100'
                                        : 'font-medium text-gray-400 dark:text-gray-400 line-through'
                                    }`}
                                  >
                                    {attempt.weight_lifted}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-gray-400">{unit}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Partial total note */}
                    {meet.total === null && (
                      <p className="text-xs text-gray-400 dark:text-gray-400 mb-4">
                        Partial meet — total requires at least one made attempt on each lift.
                      </p>
                    )}

                    {/* Strength scores */}
                    {meetScores && (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 grid grid-cols-3 gap-3">
                        {[
                          { label: 'Wilks', value: meetScores.wilks },
                          { label: 'DOTS', value: meetScores.dots },
                          { label: 'IPF-GL', value: meetScores.ipfgl },
                        ].map(score => (
                          <div key={score.label} className="text-center">
                            <p className="text-xs text-gray-400 dark:text-gray-400 mb-0.5">{score.label}</p>
                            <p className="text-lg font-black tabular-nums text-gray-900 dark:text-gray-100">
                              {score.value.toFixed(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              });
            })()}
          </div>
        )}
      </div>

      <PastMeetModal
        isOpen={showPastMeetModal}
        onClose={() => setShowPastMeetModal(false)}
        onSaved={() => { loadSessions(); }}
        unitPreference={profile.unit_preference || 'lb'}
      />
    </div>
  );
}
