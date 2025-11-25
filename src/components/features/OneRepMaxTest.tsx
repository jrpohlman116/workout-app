import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Info, Check } from 'lucide-react';

interface OneRepMaxTestProps {
  onClose: () => void;
  onComplete: () => void;
}

type LiftType = 'squat' | 'bench' | 'deadlift' | 'ohp';

export default function OneRepMaxTest({ onClose, onComplete }: OneRepMaxTestProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [selectedLift, setSelectedLift] = useState<LiftType | null>(null);
  const [testedWeight, setTestedWeight] = useState('');
  const [step, setStep] = useState<'select' | 'guide' | 'record'>('select');
  const [saving, setSaving] = useState(false);

  if (!profile || !user) return null;

  const lifts = [
    { name: 'Squat', type: 'squat' as LiftType, currentMax: profile.squat_max },
    { name: 'Bench Press', type: 'bench' as LiftType, currentMax: profile.bench_max },
    { name: 'Deadlift', type: 'deadlift' as LiftType, currentMax: profile.deadlift_max },
    { name: 'Overhead Press', type: 'ohp' as LiftType, currentMax: profile.ohp_max },
  ];

  const selectedLiftInfo = lifts.find(l => l.type === selectedLift);

  const generateWarmupSets = (estimatedMax: number) => {
    const unit = profile.unit_preference || 'lb';
    const warmup = [
      { weight: Math.round(estimatedMax * 0.5 / 5) * 5, reps: 5, label: 'Warm-up Set 1' },
      { weight: Math.round(estimatedMax * 0.7 / 5) * 5, reps: 3, label: 'Warm-up Set 2' },
      { weight: Math.round(estimatedMax * 0.85 / 5) * 5, reps: 1, label: 'Warm-up Set 3' },
      { weight: Math.round(estimatedMax * 0.95 / 5) * 5, reps: 1, label: 'Final Warm-up' },
    ];

    return warmup.map(set => ({
      ...set,
      unit,
    }));
  };

  const handleSelectLift = (liftType: LiftType) => {
    setSelectedLift(liftType);
    setStep('guide');
  };

  const handleProceedToRecord = () => {
    setStep('record');
  };

  const handleSaveTest = async () => {
    if (!selectedLift || !testedWeight || !selectedLiftInfo) return;

    setSaving(true);
    try {
      const weight = parseFloat(testedWeight);

      await supabase.from('workout_sessions').insert({
        user_id: user.id,
        lift_type: selectedLift,
        cycle: profile.current_cycle,
        week: profile.current_week,
        weight_lifted: weight,
        reps_performed: 1,
        calculated_1rm: weight,
        is_1rm_test: true,
        notes: `1RM Test - Previous estimated max: ${selectedLiftInfo.currentMax} ${profile.unit_preference || 'lb'}`,
        completed_at: new Date().toISOString(),
      });

      const maxField = `${selectedLift}_max`;
      await supabase
        .from('user_profiles')
        .update({
          [maxField]: weight,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      await refreshProfile();
      onComplete();
    } catch (error) {
      console.error('Error saving 1RM test:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">1RM Testing</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">About 1RM Testing</p>
                    <p className="text-sm text-gray-700">
                      Test your true 1 rep max to update your training maxes. The app will guide you through
                      a proper warm-up protocol and update your program based on your tested max.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Select a lift to test:</h3>

              <div className="grid grid-cols-1 gap-3">
                {lifts.map((lift) => (
                  <button
                    key={lift.type}
                    onClick={() => handleSelectLift(lift.type)}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{lift.name}</p>
                        <p className="text-sm text-gray-600">
                          Current tested max: {lift.currentMax} {profile.unit_preference || 'lb'}
                        </p>
                      </div>
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'guide' && selectedLiftInfo && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedLiftInfo.name}</h3>
                <p className="text-gray-700">
                  Current tested max: <span className="font-semibold">{selectedLiftInfo.currentMax} {profile.unit_preference || 'lb'}</span>
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Suggested Warm-up Protocol
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Follow these warm-up sets to prepare for your max attempt. Rest 2-3 minutes between sets.
                </p>
                <div className="space-y-2">
                  {generateWarmupSets(selectedLiftInfo.currentMax).map((set, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-gray-700">{set.label}</span>
                      <span className="font-semibold text-gray-900">
                        {set.weight} {set.unit} × {set.reps}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Attempt Your Max
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Rest 5-7 minutes after your final warm-up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Start with a weight you are confident you can lift</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>If successful, rest 5-7 minutes and attempt a heavier weight</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Continue until you find your true 1 rep max</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleProceedToRecord}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Record My Max
                </button>
              </div>
            </div>
          )}

          {step === 'record' && selectedLiftInfo && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedLiftInfo.name}</h3>
                <p className="text-gray-700">
                  Previous tested max: <span className="font-semibold">{selectedLiftInfo.currentMax} {profile.unit_preference || 'lb'}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Tested 1 Rep Max
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={testedWeight}
                    onChange={(e) => setTestedWeight(e.target.value)}
                    placeholder="Enter weight"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="px-4 py-3 bg-gray-100 rounded-xl font-semibold text-gray-700 flex items-center">
                    {profile.unit_preference || 'lb'}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-600 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900 mb-1">Your training max will be updated</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('guide')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveTest}
                  disabled={!testedWeight || saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save & Update Program'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
