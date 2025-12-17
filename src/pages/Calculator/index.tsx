import { useState, useEffect } from 'react';
import { calculateOneRepMax, calculateWilksScore } from '../../lib/calculations';
import { Info } from 'lucide-react';
import { useRipple } from '../../hooks/useAnimations';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Tab = '1rm' | 'wilks' | 'plates';

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('1rm');
  const createRipple = useRipple();
  const { profile } = useAuth();

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

  const [targetWeight, setTargetWeight] = useState('');
  const [barWeight, setBarWeight] = useState('45');
  const [plateUnit, setPlateUnit] = useState('lb');
  const [calculatedPlates, setCalculatedPlates] = useState<{ weight: number; count: number }[] | null>(null);

  const defaultPlatesLb = [45, 35, 25, 10, 5, 2.5];
  const defaultPlatesKg = [25, 20, 15, 10, 5, 2.5, 1.25];

  const [selectedPlatesLb, setSelectedPlatesLb] = useState<number[]>(defaultPlatesLb);
  const [selectedPlatesKg, setSelectedPlatesKg] = useState<number[]>(defaultPlatesKg);

  useEffect(() => {
    if (profile?.available_plates_lb) {
      setSelectedPlatesLb(profile.available_plates_lb);
    }
    if (profile?.available_plates_kg) {
      setSelectedPlatesKg(profile.available_plates_kg);
    }
  }, [profile]);

  useEffect(() => {
    setBarWeight(plateUnit === 'lb' ? '45' : '20');
  }, [plateUnit]);

  const togglePlate = (plate: number, unit: 'lb' | 'kg') => {
    if (unit === 'lb') {
      setSelectedPlatesLb(prev =>
        prev.includes(plate)
          ? prev.filter(p => p !== plate)
          : [...prev, plate].sort((a, b) => b - a)
      );
    } else {
      setSelectedPlatesKg(prev =>
        prev.includes(plate)
          ? prev.filter(p => p !== plate)
          : [...prev, plate].sort((a, b) => b - a)
      );
    }
  };

  const savePlatePreferences = async () => {
    if (!profile) return;

    await supabase
      .from('user_profiles')
      .update({
        available_plates_lb: selectedPlatesLb,
        available_plates_kg: selectedPlatesKg,
      })
      .eq('id', profile.id);
  };

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

  const handlePlateCalculate = () => {
    const target = parseFloat(targetWeight);
    const bar = parseFloat(barWeight);

    if (!target || !bar || target <= bar) {
      setCalculatedPlates(null);
      return;
    }

    const weightToLoad = target - bar;
    const perSide = weightToLoad / 2;

    const availablePlates = plateUnit === 'lb' ? selectedPlatesLb : selectedPlatesKg;

    const plates: { weight: number; count: number }[] = [];
    let remaining = perSide;

    for (const plate of availablePlates) {
      const count = Math.floor(remaining / plate);
      if (count > 0) {
        plates.push({ weight: plate, count });
        remaining -= count * plate;
      }
    }

    setCalculatedPlates(plates);
    savePlatePreferences();
  };

  const tabs = [
    { id: '1rm' as Tab, label: '1 RM' },
    { id: 'wilks' as Tab, label: 'Wilks Score' },
    { id: 'plates' as Tab, label: 'Plate Calculator' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">Calculator</h1>
          <p className="text-gray-600 dark:text-gray-300">Calculate your strength based on standardized formulas</p>
        </div>

        <div className="max-w-md mx-auto px-4">
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={(e) => {
                  createRipple(e);
                  setActiveTab(tab.id);
                }}
                className={`px-6 py-3 font-semibold transition-all ripple-container relative overflow-hidden ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-[2px]'
                    : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {activeTab === '1rm' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">1 Rep Max</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                Calculate your one-rep max using the weight you lifted and the number of repetitions completed.
                This 1 rep max is calculated using the Epley formula: Weight x (1 + (Reps / 30))
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Weight
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 125, 80, 45"
                    min="0"
                    step="0.5"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="lb">lb</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Repetitions
                </label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="e.g., 5, 8, 10"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <button
                onClick={handleCalculate}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Calculate
              </button>
            </div>

            {calculatedMax !== null && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-up">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">Your Estimated 1RM</p>
                <div className="text-5xl font-bold text-gray-900 dark:text-gray-100">{calculatedMax} {unit}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wilks' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Wilks Score</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                Compare powerlifting strength across bodyweights. Wilks score is typically used in competitions.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Squat Max
                  </label>
                  <input
                    type="number"
                    value={wilksSquat}
                    onChange={(e) => setWilksSquat(e.target.value)}
                    placeholder="e.g. 315"
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Bench Press Max
                  </label>
                  <input
                    type="number"
                    value={wilksBench}
                    onChange={(e) => setWilksBench(e.target.value)}
                    placeholder="e.g. 225"
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Deadlift Max
                  </label>
                  <input
                    type="number"
                    value={wilksDeadlift}
                    onChange={(e) => setWilksDeadlift(e.target.value)}
                    placeholder="e.g. 405"
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Bodyweight
                  </label>
                  <input
                    type="number"
                    value={wilksBodyweight}
                    onChange={(e) => setWilksBodyweight(e.target.value)}
                    placeholder="e.g. 180"
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Gender
                    </label>
                    <select
                      value={wilksGender}
                      onChange={(e) => setWilksGender(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Unit
                    </label>
                    <select
                      value={wilksUnit}
                      onChange={(e) => setWilksUnit(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="lb">lb</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleWilksCalculate}
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>

            {calculatedWilks !== null && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-up">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">Your Wilks Score</p>
                <div className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">{calculatedWilks}</div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {calculatedWilks < 250 && 'Beginner (<250) - Building strength fundamentals'}
                  {calculatedWilks >= 250 && calculatedWilks < 350 && 'Intermediate (250-349) - Solid strength development'}
                  {calculatedWilks >= 350 && calculatedWilks < 450 && 'Advanced (350-449) - Impressive strength levels'}
                  {calculatedWilks >= 450 && 'Elite (450+) - Competition-level strength'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plates' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Plate Calculator</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                Calculate which plates to load on each side of the bar to reach your target weight.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <select
                  value={plateUnit}
                  onChange={(e) => setPlateUnit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Available Plates
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(plateUnit === 'lb' ? defaultPlatesLb : defaultPlatesKg).map(plate => {
                    const isSelected = plateUnit === 'lb'
                      ? selectedPlatesLb.includes(plate)
                      : selectedPlatesKg.includes(plate);

                    return (
                      <button
                        key={plate}
                        type="button"
                        onClick={() => togglePlate(plate, plateUnit as 'lb' | 'kg')}
                        className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {plate} {plateUnit}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Select the plates you have available
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Target Weight ({plateUnit})
                </label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="e.g. 225, 315, 405"
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Bar Weight ({plateUnit})
                </label>
                <input
                  type="number"
                  value={barWeight}
                  onChange={(e) => setBarWeight(e.target.value)}
                  placeholder={plateUnit === 'lb' ? 'e.g. 45' : 'e.g. 20'}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard bar is 45 lb / 20 kg</p>
              </div>

              <button
                onClick={handlePlateCalculate}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Calculate
              </button>
            </div>

            {calculatedPlates !== null && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 animate-slide-up">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">Load per side:</p>
                {calculatedPlates.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-300">Just the bar (no plates needed)</p>
                ) : (
                  <div className="space-y-3">
                    {calculatedPlates.map((plate, index) => (
                      <div key={index} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {plate.weight} {plateUnit}
                        </span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          × {plate.count}
                        </span>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Total weight breakdown:</p>
                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>Bar:</span>
                          <span className="font-semibold">{barWeight} {plateUnit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Plates (both sides):</span>
                          <span className="font-semibold">
                            {calculatedPlates.reduce((sum, p) => sum + (p.weight * p.count * 2), 0)} {plateUnit}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                          <span>Total:</span>
                          <span className="text-blue-600">{targetWeight} {plateUnit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
