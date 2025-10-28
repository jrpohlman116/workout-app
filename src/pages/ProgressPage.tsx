import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, WorkoutSession } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';
import { getCycleProgression } from '../lib/calculations';

export default function ProgressPage() {
  const { profile, user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

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
    }
  };

  if (!profile) return null;

  const getLatestMaxForLift = (liftType: string) => {
    const liftSessions = sessions.filter(s => s.lift_type === liftType);
    if (liftSessions.length === 0) return 0;
    return liftSessions[liftSessions.length - 1].calculated_1rm;
  };

  const getMaxChangePercent = (liftType: string, initialMax: number) => {
    const currentMax = getLatestMaxForLift(liftType);
    if (initialMax === 0) return 0;
    return (((currentMax - initialMax) / initialMax) * 100).toFixed(1);
  };

  const lifts = [
    { name: 'Max Squat', type: 'squat', initial: profile.squat_max },
    { name: 'Max Bench', type: 'bench', initial: profile.bench_max },
    { name: 'Max Deadlift', type: 'deadlift', initial: profile.deadlift_max },
    { name: 'Max OHP', type: 'ohp', initial: profile.ohp_max },
  ];

  const progression = getCycleProgression(profile.current_cycle);

  const renderChart = () => {
    const liftTypes = ['squat', 'bench', 'deadlift', 'ohp'];
    const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b'];

    const chartData = liftTypes.map((type, idx) => {
      const liftSessions = sessions.filter(s => s.lift_type === type);
      return {
        type,
        color: colors[idx],
        data: liftSessions.map(s => s.calculated_1rm),
      };
    });

    const allValues = chartData.flatMap(d => d.data);
    const maxValue = Math.max(...allValues, 100);
    const minValue = Math.min(...allValues, 0);
    const range = maxValue - minValue;

    return (
      <svg viewBox="0 0 600 300" className="w-full h-64">
        <defs>
          {chartData.map((lift, idx) => (
            <linearGradient key={idx} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lift.color} />
              <stop offset="100%" stopColor={lift.color} stopOpacity="0.6" />
            </linearGradient>
          ))}
        </defs>

        {chartData.map((lift, liftIdx) => {
          if (lift.data.length < 2) return null;

          const points = lift.data.map((value, i) => {
            const x = 50 + (i / (lift.data.length - 1)) * 500;
            const y = 250 - ((value - minValue) / range) * 200;
            return `${x},${y}`;
          }).join(' ');

          return (
            <polyline
              key={liftIdx}
              points={points}
              fill="none"
              stroke={`url(#grad-${liftIdx})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1={50 + i * 45}
            y1="50"
            x2={50 + i * 45}
            y2="250"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        <text x="60" y="280" fontSize="12" fill="#9ca3af">Sep</text>
        <text x="150" y="280" fontSize="12" fill="#9ca3af">Oct</text>
        <text x="240" y="280" fontSize="12" fill="#9ca3af">Nov</text>
        <text x="330" y="280" fontSize="12" fill="#9ca3af">Dec</text>
        <text x="420" y="280" fontSize="12" fill="#9ca3af">Jan</text>
        <text x="510" y="280" fontSize="12" fill="#9ca3af">Feb</text>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Progress</h1>
          <p className="text-gray-600">Track your strength gains over time</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {sessions.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4">
            <p className="text-gray-700 font-semibold mb-1">Start tracking your progress!</p>
            <p className="text-sm text-gray-600">Complete your first workout to see your progress here.</p>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-gray-600 text-sm mb-2">Current Cycle</p>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-12 h-12 text-blue-600" />
            <div>
              <span className="text-4xl font-bold text-gray-900">{profile.current_cycle}</span>
              <span className="text-gray-600 text-lg ml-2">+{progression} lbs</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Estimated 1RM Over Time</h2>
          <p className="text-xs text-gray-500 mb-4">Based on your AMRAP set performance each week</p>
          {sessions.length < 2 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">Complete more workouts to see your progress chart</p>
              <p className="text-sm text-gray-500">Your strength trend will appear here after a few sessions</p>
            </div>
          ) : (
            renderChart()
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {lifts.map((lift) => {
            const currentMax = getLatestMaxForLift(lift.type) || lift.initial;
            const changePercent = parseFloat(getMaxChangePercent(lift.type, lift.initial));
            const hasData = sessions.some(s => s.lift_type === lift.type);

            return (
              <div key={lift.type} className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-gray-600 text-sm mb-2">{lift.name}</p>
                <div className="text-3xl font-bold text-blue-600 mb-1">{currentMax} lb</div>
                {hasData ? (
                  <div className={`text-sm font-semibold ${
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
    </div>
  );
}
