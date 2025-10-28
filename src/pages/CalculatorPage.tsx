import { useState } from 'react';
import { calculateOneRepMax, calculateWilksScore } from '../lib/calculations';
import { Info } from 'lucide-react';

export default function CalculatorPage() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [unit, setUnit] = useState('lb');
  const [calculatedMax, setCalculatedMax] = useState<number | null>(null);

  const [wilksSquat, setWilksSquat] = useState('');
  const [wilksBench, setWilksBench] = useState('');
  const [wilksDeadlift, setWilksDeadlift] = useState('');
  const [wilksBodyweight, setWilksBodyweight] = useState('');
  const [wilksGender, setWilksGender] = useState('male');
  const [wilksUnit, setWilksUnit] = useState('lb');
  const [calculatedWilks, setCalculatedWilks] = useState<number | null>(null);

  const handleCalculate = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);

    if (w && r) {
      const max = calculateOneRepMax(w, r);
      setCalculatedMax(max);
    }
  };

  const handleWilksCalculate = () => {
    const squat = parseFloat(wilksSquat) || 0;
    const bench = parseFloat(wilksBench) || 0;
    const deadlift = parseFloat(wilksDeadlift) || 0;
    const bodyweight = parseFloat(wilksBodyweight);

    if (bodyweight > 0) {
      const lbToKg = (weight: number) => wilksUnit === 'lb' ? weight * 0.453592 : weight;
      const score = calculateWilksScore(
        lbToKg(squat),
        lbToKg(bench),
        lbToKg(deadlift),
        lbToKg(bodyweight),
        wilksGender
      );
      setCalculatedWilks(score);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Calculator</h1>
          <p className="text-gray-600">Determine your 1 rep-max</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Weight
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 125, 80, 45"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Repetitions
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="Placeholder"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleCalculate}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Calculate
          </button>
        </div>

        {calculatedMax !== null && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <p className="text-gray-600 text-sm mb-2">Calculated 1 Rep Max</p>
              <div className="text-5xl font-bold text-gray-900">{calculatedMax} lbs</div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 flex gap-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">
                  This 1 rep max was calculated using the Epley formula:
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  Weight x (1 + (Reps / 30))
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wilks Score Calculator</h2>
          <p className="text-gray-600 mb-6">Compare powerlifting strength across bodyweights</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Squat Max
              </label>
              <input
                type="number"
                value={wilksSquat}
                onChange={(e) => setWilksSquat(e.target.value)}
                placeholder="e.g. 315"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bench Press Max
              </label>
              <input
                type="number"
                value={wilksBench}
                onChange={(e) => setWilksBench(e.target.value)}
                placeholder="e.g. 225"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deadlift Max
              </label>
              <input
                type="number"
                value={wilksDeadlift}
                onChange={(e) => setWilksDeadlift(e.target.value)}
                placeholder="e.g. 405"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bodyweight
              </label>
              <input
                type="number"
                value={wilksBodyweight}
                onChange={(e) => setWilksBodyweight(e.target.value)}
                placeholder="e.g. 180"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={wilksGender}
                  onChange={(e) => setWilksGender(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unit
                </label>
                <select
                  value={wilksUnit}
                  onChange={(e) => setWilksUnit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleWilksCalculate}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Calculate Wilks
            </button>
          </div>
        </div>

        {calculatedWilks !== null && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <p className="text-gray-600 text-sm mb-2">Your Wilks Score</p>
              <div className="text-5xl font-bold text-gray-900 mb-3">{calculatedWilks}</div>
              <p className="text-sm text-gray-600">
                {calculatedWilks < 250 && 'Beginner - Keep building your foundation'}
                {calculatedWilks >= 250 && calculatedWilks < 350 && 'Intermediate - Solid strength development'}
                {calculatedWilks >= 350 && calculatedWilks < 450 && 'Advanced - Impressive strength levels'}
                {calculatedWilks >= 450 && 'Elite - Exceptional powerlifting performance'}
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 flex gap-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">
                  The Wilks Score normalizes powerlifting totals across different bodyweights, allowing fair comparisons between lifters. It considers your squat, bench, and deadlift totals relative to your bodyweight and gender.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
