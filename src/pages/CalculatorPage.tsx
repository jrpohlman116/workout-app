import { useState } from 'react';
import { calculateOneRepMax } from '../lib/calculations';
import { Info } from 'lucide-react';

export default function CalculatorPage() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [unit, setUnit] = useState('lb');
  const [calculatedMax, setCalculatedMax] = useState<number | null>(null);

  const handleCalculate = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);

    if (w && r) {
      const max = calculateOneRepMax(w, r);
      setCalculatedMax(max);
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
      </div>
    </div>
  );
}
