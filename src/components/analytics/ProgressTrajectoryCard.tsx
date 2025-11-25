import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Award } from 'lucide-react';

interface PredictionData {
  liftType: string;
  liftName: string;
  currentMax: number;
  predictionCycle1: number;
  predictionCycle2: number;
  predictionCycle3: number;
  strengthTier: string;
  improvementVelocity: number;
  confidenceScore: number;
  milestoneWeights: { [weight: number]: string };
  historicalData: { date: string; value: number }[];
}

interface ProgressTrajectoryCardProps {
  predictions: PredictionData[];
  unitPreference: string;
}

export default function ProgressTrajectoryCard({ predictions, unitPreference }: ProgressTrajectoryCardProps) {
  const [selectedLift, setSelectedLift] = useState<string>('all');

  const liftOptions = [
    { value: 'all', label: 'All Lifts' },
    ...predictions.map(p => ({ value: p.liftType, label: p.liftName }))
  ];

  const colors: { [key: string]: string } = {
    squat: '#3b82f6',
    bench: '#10b981',
    deadlift: '#8b5cf6',
    ohp: '#f59e0b'
  };

  const getTierBadgeColor = (tier: string): string => {
    switch (tier) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'elite': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceBadgeColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  const generateChartData = () => {
    const filteredPredictions = selectedLift === 'all'
      ? predictions
      : predictions.filter(p => p.liftType === selectedLift);

    const allDates = new Set<string>();
    filteredPredictions.forEach(pred => {
      pred.historicalData.forEach(point => allDates.add(point.date));
    });

    const today = new Date();
    const cycle1Date = new Date(today);
    cycle1Date.setDate(today.getDate() + 28);
    const cycle2Date = new Date(today);
    cycle2Date.setDate(today.getDate() + 56);
    const cycle3Date = new Date(today);
    cycle3Date.setDate(today.getDate() + 84);

    allDates.add(today.toISOString().split('T')[0]);
    allDates.add(cycle1Date.toISOString().split('T')[0]);
    allDates.add(cycle2Date.toISOString().split('T')[0]);
    allDates.add(cycle3Date.toISOString().split('T')[0]);

    const sortedDates = Array.from(allDates).sort();

    const chartData = sortedDates.map(date => {
      const dataPoint: any = {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date
      };

      filteredPredictions.forEach(pred => {
        const historical = pred.historicalData.find(h => h.date.split('T')[0] === date);
        if (historical) {
          dataPoint[`${pred.liftType}_actual`] = historical.value;
        }

        if (date === today.toISOString().split('T')[0]) {
          dataPoint[`${pred.liftType}_predicted`] = pred.currentMax;
        } else if (date === cycle1Date.toISOString().split('T')[0]) {
          dataPoint[`${pred.liftType}_predicted`] = pred.predictionCycle1;
        } else if (date === cycle2Date.toISOString().split('T')[0]) {
          dataPoint[`${pred.liftType}_predicted`] = pred.predictionCycle2;
        } else if (date === cycle3Date.toISOString().split('T')[0]) {
          dataPoint[`${pred.liftType}_predicted`] = pred.predictionCycle3;
        }
      });

      return dataPoint;
    });

    return chartData;
  };

  const chartData = generateChartData();

  const getMilestones = () => {
    if (selectedLift === 'all') return [];
    const prediction = predictions.find(p => p.liftType === selectedLift);
    if (!prediction) return [];

    return Object.entries(prediction.milestoneWeights)
      .map(([weight, date]) => ({
        weight: parseInt(weight),
        date,
        weeksAway: Math.ceil((new Date(date).getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000))
      }))
      .filter(m => m.weeksAway > 0)
      .slice(0, 3);
  };

  const milestones = getMilestones();

  const selectedPrediction = selectedLift !== 'all'
    ? predictions.find(p => p.liftType === selectedLift)
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Progress Trajectory</h2>
          <p className="text-sm text-gray-600 mt-1">Predicted strength progression</p>
        </div>
        <select
          value={selectedLift}
          onChange={(e) => setSelectedLift(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {liftOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedPrediction && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Current Max</p>
            <p className="text-2xl font-bold text-gray-900">
              {selectedPrediction.currentMax} {unitPreference}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">+1 Cycle</p>
            <p className="text-2xl font-bold text-blue-600">
              {selectedPrediction.predictionCycle1} {unitPreference}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Improvement Rate</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xl font-bold text-gray-900">
                +{selectedPrediction.improvementVelocity} {unitPreference}
              </p>
            </div>
            <p className="text-xs text-gray-500">per cycle</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-1">Strength Tier</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getTierBadgeColor(selectedPrediction.strengthTier)}`}>
              {selectedPrediction.strengthTier}
            </span>
          </div>
        </div>
      )}

      <div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              label={{ value: unitPreference, angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            {selectedLift === 'all' ? (
              predictions.map(pred => (
                <Line
                  key={`${pred.liftType}_actual`}
                  type="monotone"
                  dataKey={`${pred.liftType}_actual`}
                  stroke={colors[pred.liftType]}
                  strokeWidth={2}
                  dot={{ fill: colors[pred.liftType], r: 3 }}
                  name={`${pred.liftName} (Actual)`}
                  connectNulls
                />
              ))
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey={`${selectedLift}_actual`}
                  stroke={colors[selectedLift] || '#3b82f6'}
                  strokeWidth={3}
                  dot={{ fill: colors[selectedLift] || '#3b82f6', r: 4 }}
                  name="Actual 1RM"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={`${selectedLift}_predicted`}
                  stroke={colors[selectedLift] || '#3b82f6'}
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: colors[selectedLift] || '#3b82f6', r: 4 }}
                  name="Predicted"
                  connectNulls
                />
              </>
            )}
            <ReferenceLine
              x={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              label={{ value: 'Today', position: 'top', fill: '#6b7280', fontSize: 10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {selectedPrediction && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Upcoming Milestones</h3>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getConfidenceBadgeColor(selectedPrediction.confidenceScore)}`}>
              {selectedPrediction.confidenceScore}% Confidence
            </span>
          </div>

          {milestones.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {milestones.map((milestone) => (
                <div key={milestone.weight} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    <p className="text-2xl font-bold text-gray-900">
                      {milestone.weight} {unitPreference}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    ~{milestone.weeksAway} week{milestone.weeksAway !== 1 ? 's' : ''} away
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Keep training consistently to see milestone predictions!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
