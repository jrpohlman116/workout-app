import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface FatigueData {
  weekStartDate: string;
  trainingStressScore: number;
  acuteChronicRatio: number;
  fatigueStatus: 'fresh' | 'optimal' | 'moderate' | 'high' | 'severe';
  perceivedExertion: number | null;
}

interface FatigueManagementCardProps {
  currentWeekData: FatigueData;
  historicalData: FatigueData[];
  recommendedAction: string;
  daysUntilDeload: number;
}

export default function FatigueManagementCard({
  currentWeekData,
  historicalData,
  recommendedAction,
  daysUntilDeload
}: FatigueManagementCardProps) {
  const getTSSColor = (tss: number): string => {
    if (tss < 80) return '#10b981';
    if (tss < 120) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'fresh': return 'bg-blue-100 text-blue-800';
      case 'optimal': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'severe': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'optimal' || status === 'fresh') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-orange-600" />;
  };

  const getACRZone = (ratio: number): string => {
    if (ratio < 0.8) return 'Under-reaching';
    if (ratio <= 1.3) return 'Optimal Zone';
    if (ratio <= 1.5) return 'Moderate Risk';
    if (ratio <= 1.8) return 'High Risk';
    return 'Severe Risk';
  };

  const getACRZoneColor = (ratio: number): string => {
    if (ratio < 0.8) return 'bg-blue-500';
    if (ratio <= 1.3) return 'bg-green-500';
    if (ratio <= 1.5) return 'bg-yellow-500';
    if (ratio <= 1.8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const chartData = historicalData.map(data => ({
    week: new Date(data.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tss: data.trainingStressScore,
    perceived: data.perceivedExertion ? data.perceivedExertion * 10 : null
  }));

  const tssColor = getTSSColor(currentWeekData.trainingStressScore);
  const tssPercentage = Math.min((currentWeekData.trainingStressScore / 150) * 100, 100);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fatigue Management</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor your training stress and recovery</p>
        </div>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Training Stress Score (TSS) measures your overall training load. Acute:Chronic ratio compares current week to 4-week average."
        >
          <Info className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-3">Training Stress Score</p>
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={tssColor}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(tssPercentage / 100) * 439.8} 439.8`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: tssColor }}>
                    {Math.round(currentWeekData.trainingStressScore)}
                  </div>
                  <div className="text-xs text-gray-500">/ 150</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Status</span>
              {getStatusIcon(currentWeekData.fatigueStatus)}
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(currentWeekData.fatigueStatus)}`}>
              {currentWeekData.fatigueStatus}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Acute:Chronic Ratio</span>
              <span className="text-lg font-bold text-gray-900">
                {currentWeekData.acuteChronicRatio.toFixed(2)}
              </span>
            </div>
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 right-0 flex">
                <div className="flex-1 border-r-2 border-white bg-blue-300"></div>
                <div className="flex-1 border-r-2 border-white bg-green-300"></div>
                <div className="flex-1 border-r-2 border-white bg-yellow-300"></div>
                <div className="flex-1 border-r-2 border-white bg-orange-300"></div>
                <div className="flex-1 bg-red-300"></div>
              </div>
              <div
                className={`absolute inset-y-0 ${getACRZoneColor(currentWeekData.acuteChronicRatio)} opacity-80`}
                style={{
                  left: `${Math.min((currentWeekData.acuteChronicRatio / 2) * 100, 100)}%`,
                  width: '4px'
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.0</span>
              <span>0.8</span>
              <span>1.3</span>
              <span>1.5</span>
              <span>1.8</span>
              <span>2.0+</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Zone: <span className="font-medium">{getACRZone(currentWeekData.acuteChronicRatio)}</span>
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Next Deload</span>
              <span className="text-2xl font-bold text-gray-900">{daysUntilDeload}</span>
            </div>
            <p className="text-xs text-gray-500">days remaining</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">8-Week TSS Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              domain={[0, 150]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Line
              type="monotone"
              dataKey="tss"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              name="Calculated TSS"
            />
            {chartData.some(d => d.perceived !== null) && (
              <Line
                type="monotone"
                dataKey="perceived"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f59e0b', r: 4 }}
                name="Perceived (scaled)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Recommendation</h4>
            <p className="text-sm text-blue-800">{recommendedAction}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
