import { useState, useEffect } from 'react';
import { calculateOneRepMax, calculateWilksScore, getWilksLevel } from '../../lib/calculations';
import { useRipple } from '../../hooks/useAnimations';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import TabBar from '../../components/ui/TabBar';
import SectionLabel from '../../components/ui/SectionLabel';
import Select from '../../components/ui/Select';
import type { CalculatorTab as Tab } from '../../lib/types';

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('1rm');
  const createRipple = useRipple();
  const { profile } = useAuth();

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [unit, setUnit] = useState(profile?.unit_preference || 'lb');
  const [calculatedMax, setCalculatedMax] = useState<number | null>(null);

  const [wilksSquat, setWilksSquat] = useState('');
  const [wilksBench, setWilksBench] = useState('');
  const [wilksDeadlift, setWilksDeadlift] = useState('');
  const [wilksBodyweight, setWilksBodyweight] = useState('');
  const [wilksGender, setWilksGender] = useState('male');
  const [wilksUnit, setWilksUnit] = useState(profile?.unit_preference || 'lb');
  const [calculatedWilks, setCalculatedWilks] = useState<number | null>(null);

  const [targetWeight, setTargetWeight] = useState('');
  const [barWeight, setBarWeight] = useState('45');
  const [plateUnit, setPlateUnit] = useState(profile?.unit_preference || 'lb');
  const [calculatedPlates, setCalculatedPlates] = useState<{ weight: number; count: number }[] | null>(null);

  const defaultPlatesLb = [45, 35, 25, 10, 5, 2.5];
  const defaultPlatesKg = [25, 20, 15, 10, 5, 2.5, 1.25];

  const [selectedPlatesLb, setSelectedPlatesLb] = useState<number[]>(defaultPlatesLb);
  const [selectedPlatesKg, setSelectedPlatesKg] = useState<number[]>(defaultPlatesKg);

  useEffect(() => {
    if (profile?.unit_preference) {
      setUnit(profile.unit_preference);
      setWilksUnit(profile.unit_preference);
      setPlateUnit(profile.unit_preference);
    }
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
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Tools" title="Calculator" />
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} onRipple={createRipple} />
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {activeTab === '1rm' && (
          <div className="space-y-4 animate-enter">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">1 Rep Max</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                Calculate your one-rep max using the weight you lifted and the number of repetitions completed.
                This 1 rep max is calculated using the Epley formula: Weight x (1 + (Reps / 30))
              </p>

              <div className="mb-6 flex gap-3 items-end">
                <Input
                  label="Weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 125, 80, 45"
                  min="0"
                  step="0.5"
                  className="flex-1"
                />
                <Select
                  id="oneRM-unit"
                  label="Unit"
                  value={unit}
                  options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]}
                  onChange={(val) => setUnit(val as string)}
                />
              </div>

              <div className="mb-6">
                <Input
                  label="Repetitions"
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="e.g., 5, 8, 10"
                  min="0"
                />
              </div>

              <Button fullWidth onClick={handleCalculate}>Calculate</Button>
            </Card>

            {calculatedMax !== null && (
              <Card className="p-6 animate-enter">
                <SectionLabel className="mb-2">Estimated 1RM</SectionLabel>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tabular-nums text-gray-900 dark:text-gray-100">{calculatedMax}</span>
                  <span className="text-lg font-medium text-gray-400 dark:text-gray-400">{unit}</span>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'wilks' && (
          <div className="space-y-4 animate-enter">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Wilks Score</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                Compare powerlifting strength across bodyweights. Wilks score is typically used in competitions.
              </p>

              <div className="space-y-4">
                <Input label="Squat Max" type="number" value={wilksSquat} onChange={(e) => setWilksSquat(e.target.value)} placeholder="e.g. 315" min="0" step="0.5" />
                <Input label="Bench Press Max" type="number" value={wilksBench} onChange={(e) => setWilksBench(e.target.value)} placeholder="e.g. 225" min="0" step="0.5" />
                <Input label="Deadlift Max" type="number" value={wilksDeadlift} onChange={(e) => setWilksDeadlift(e.target.value)} placeholder="e.g. 405" min="0" step="0.5" />
                <Input label="Bodyweight" type="number" value={wilksBodyweight} onChange={(e) => setWilksBodyweight(e.target.value)} placeholder="e.g. 180" min="0" step="0.1" />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    id="wilks-gender"
                    label="Gender"
                    value={wilksGender}
                    options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
                    onChange={(val) => setWilksGender(val as string)}
                  />
                  <Select
                    id="wilks-unit"
                    label="Unit"
                    value={wilksUnit}
                    options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]}
                    onChange={(val) => setWilksUnit(val as string)}
                  />
                </div>

                <Button fullWidth onClick={handleWilksCalculate}>Calculate</Button>
              </div>
            </Card>

            {calculatedWilks !== null && (
              <Card className="p-6 animate-enter">
                <SectionLabel className="mb-2">Wilks Score</SectionLabel>
                <p className="text-5xl font-black tabular-nums text-gray-900 dark:text-gray-100 mb-2">{calculatedWilks}</p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  {getWilksLevel(calculatedWilks)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {calculatedWilks < 300
                    ? '300+ is competitive club level'
                    : calculatedWilks < 400
                      ? 'Solid development. 300+ is competitive club level.'
                      : '400+ qualifies for most national events.'}
                </p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'plates' && (
          <div className="space-y-4 animate-enter">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Plate Calculator</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                Calculate which plates to load on each side of the bar to reach your target weight.
              </p>

              <div className="mb-6">
                <Select
                  id="plate-unit"
                  label="Unit"
                  value={plateUnit}
                  options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]}
                  onChange={(val) => setPlateUnit(val as string)}
                />
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
                        className={`px-4 py-3 rounded-xl font-semibold tabular-nums transition-all ${
                          isSelected
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
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
                <Input
                  label={`Target Weight (${plateUnit})`}
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="e.g. 225, 315, 405"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="mb-6">
                <Input
                  label={`Bar Weight (${plateUnit})`}
                  type="number"
                  value={barWeight}
                  onChange={(e) => setBarWeight(e.target.value)}
                  placeholder={plateUnit === 'lb' ? 'e.g. 45' : 'e.g. 20'}
                  min="0"
                  step="0.5"
                  hint="Standard bar is 45 lb / 20 kg"
                />
              </div>

              <Button fullWidth onClick={handlePlateCalculate}>Calculate</Button>
            </Card>

            {calculatedPlates !== null && (
              <Card className="p-6 animate-enter">
                <SectionLabel className="mb-4">Load per side</SectionLabel>
                {calculatedPlates.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Just the bar — no plates needed</p>
                ) : (
                  <div className="space-y-2">
                    {calculatedPlates.map((plate, index) => (
                      <div key={index} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <span className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400">
                          {plate.weight} {plateUnit}
                        </span>
                        <span className="text-2xl font-black tabular-nums text-gray-900 dark:text-gray-100">
                          × {plate.count}
                        </span>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Bar</span>
                        <span className="tabular-nums">{barWeight} {plateUnit}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Plates (both sides)</span>
                        <span className="tabular-nums">
                          {calculatedPlates.reduce((sum, p) => sum + (p.weight * p.count * 2), 0)} {plateUnit}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                        <span className="text-xl font-black tabular-nums text-gray-900 dark:text-gray-100">{targetWeight} {plateUnit}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
