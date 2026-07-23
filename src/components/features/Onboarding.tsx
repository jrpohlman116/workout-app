import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateOneRepMax, calculateTrainingMax } from '../../lib/calculations';
import { StickingPoint, WeakPoints } from '../../lib/supabase';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Calculator } from 'lucide-react';

type MainLift = 'squat' | 'bench' | 'deadlift';

interface LiftCalculatorState {
  weight: string;
  reps: string;
  calculatedMax: number | null;
}

const TOTAL_STEPS = 4;

const STICKING_POINTS: StickingPoint[] = ['in_the_hole', 'mid_range', 'lockout'];
const STICKING_POINT_LABELS: Record<StickingPoint, string> = {
  in_the_hole: 'In the Hole',
  mid_range: 'Mid Range',
  lockout: 'Lockout',
};
const STICKING_POINT_DESCRIPTIONS: Record<StickingPoint, string> = {
  in_the_hole: 'Bottom position',
  mid_range: 'Halfway up',
  lockout: 'Final inches',
};
const LIFT_LABELS: Record<MainLift, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
};

const EMPTY_WEAK_POINTS: WeakPoints = { squat: [], bench: [], deadlift: [] };

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [bodyweight, setBodyweight] = useState('');
  const [unitPreference, setUnitPreference] = useState<'lb' | 'kg'>('lb');
  const [gender, setGender] = useState('male');

  // Step 2
  const [squatMax, setSquatMax] = useState('');
  const [benchMax, setBenchMax] = useState('');
  const [deadliftMax, setDeadliftMax] = useState('');
  const [activeCalculator, setActiveCalculator] = useState<MainLift | null>(null);
  const [calculators, setCalculators] = useState<Record<MainLift, LiftCalculatorState>>({
    squat: { weight: '', reps: '', calculatedMax: null },
    bench: { weight: '', reps: '', calculatedMax: null },
    deadlift: { weight: '', reps: '', calculatedMax: null },
  });

  // Step 3
  const [meetDate, setMeetDate] = useState('');

  // Step 4
  const [weakPoints, setWeakPoints] = useState<WeakPoints>(EMPTY_WEAK_POINTS);

  const [loading, setLoading] = useState(false);
  const [announceMessage, setAnnounceMessage] = useState('');

  useEffect(() => {
    if (announceMessage) {
      const timer = setTimeout(() => setAnnounceMessage(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announceMessage]);

  const announce = (message: string) => setAnnounceMessage(message);

  const getStepTitle = (step: number) => {
    if (step === 1) return 'Basic Information';
    if (step === 2) return 'Starting Maxes';
    if (step === 3) return 'Meet or Test Date';
    return 'Sticking Points';
  };

  const handleNextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(s => s + 1);
      announce(`Step ${currentStep + 1} of ${TOTAL_STEPS}: ${getStepTitle(currentStep + 1)}`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      announce(`Step ${currentStep - 1} of ${TOTAL_STEPS}: ${getStepTitle(currentStep - 1)}`);
    }
  };

  const canProceedFromStep1 = bodyweight !== '';
  const hasAtLeastOneLift = squatMax !== '' || benchMax !== '' || deadliftMax !== '';

  // Weeks away helper for meet date display
  const weeksAway = meetDate
    ? Math.ceil((new Date(meetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  const handleCalculate = (lift: MainLift) => {
    const calc = calculators[lift];
    const weight = parseFloat(calc.weight);
    const reps = parseInt(calc.reps);
    if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps >= 1) {
      const calculated = calculateOneRepMax(weight, reps);
      setCalculators({ ...calculators, [lift]: { ...calc, calculatedMax: calculated } });
      announce(`Calculated 1 rep max: ${calculated} ${unitPreference}`);
    }
  };

  const handleUseCalculatedValue = (lift: MainLift) => {
    const calc = calculators[lift];
    if (calc.calculatedMax !== null) {
      const value = calc.calculatedMax.toString();
      if (lift === 'squat') setSquatMax(value);
      else if (lift === 'bench') setBenchMax(value);
      else if (lift === 'deadlift') setDeadliftMax(value);
      setActiveCalculator(null);
      announce(`${lift} max set to ${calc.calculatedMax} ${unitPreference}`);
    }
  };

  const toggleWeakPoint = (lift: MainLift, point: StickingPoint) => {
    setWeakPoints(prev => {
      const current = prev[lift];
      const next = current.includes(point)
        ? current.filter(p => p !== point)
        : [...current, point];
      return { ...prev, [lift]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasAtLeastOneLift) return;

    setLoading(true);
    announce('Setting up your program');

    try {
      const today = new Date().toISOString().split('T')[0];
      const hasAnyWeakPoints = Object.values(weakPoints).some(arr => arr.length > 0);

      // The form asks for a 1-rep max ("Enter Your Starting Maxes... Use the
      // calculator if you need help estimating your 1RM"), but squat_max/
      // bench_max/deadlift_max are training maxes (TM = 1RM × 0.9, per
      // calculateTrainingMax) — the entered value belongs in the
      // *_tested_max columns, with the TM derived from it, not stored
      // directly as the TM.
      const squatMaxNum = parseFloat(squatMax) || 0;
      const benchMaxNum = parseFloat(benchMax) || 0;
      const deadliftMaxNum = parseFloat(deadliftMax) || 0;

      const updatePayload: Record<string, unknown> = {
        bodyweight: parseFloat(bodyweight) || 0,
        unit_preference: unitPreference,
        gender,
        squat_max: calculateTrainingMax(squatMaxNum),
        bench_max: calculateTrainingMax(benchMaxNum),
        deadlift_max: calculateTrainingMax(deadliftMaxNum),
        squat_tested_max: squatMaxNum > 0 ? squatMaxNum : null,
        bench_tested_max: benchMaxNum > 0 ? benchMaxNum : null,
        deadlift_tested_max: deadliftMaxNum > 0 ? deadliftMaxNum : null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      if (meetDate) {
        updatePayload.meet_date = meetDate;
        updatePayload.program_start_date = today;
      }

      if (hasAnyWeakPoints) {
        updatePayload.weak_points = weakPoints;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) throw profileError;

      // Logged at the entered 1RM (not the derived TM) — a real lift of 1
      // rep at that weight is that lift's 1RM by definition.
      const initialMaxes = [
        { lift_type: 'squat', max: squatMaxNum },
        { lift_type: 'bench', max: benchMaxNum },
        { lift_type: 'deadlift', max: deadliftMaxNum },
      ].filter(lift => lift.max > 0);

      if (initialMaxes.length > 0 && profile) {
        const sessionInserts = initialMaxes.map(lift => ({
          user_id: user.id,
          lift_type: lift.lift_type,
          cycle: 0,
          week: 0,
          weight_lifted: lift.max,
          reps_performed: 1,
          calculated_1rm: lift.max,
          completed_at: profile.created_at,
        }));

        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .insert(sessionInserts);

        if (sessionError) throw sessionError;
      }

      announce('Program setup complete!');
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      announce('Error setting up program. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const liftInfo: Record<MainLift, { name: string; placeholder: string; value: string; setter: (v: string) => void }> = {
    squat: { name: 'Squat', placeholder: '315', value: squatMax, setter: setSquatMax },
    bench: { name: 'Bench Press', placeholder: '225', value: benchMax, setter: setBenchMax },
    deadlift: { name: 'Deadlift', placeholder: '405', value: deadliftMax, setter: setDeadliftMax },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <p className="text-xs tracking-wide font-semibold text-gray-400 dark:text-gray-400 mb-2">
            Juggernaut Method
          </p>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">
            Build Your Program
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Four steps. Done in under two minutes.
          </p>
        </div>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announceMessage}
        </div>

        <div className="mb-6" role="group" aria-label="Progress indicator">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-wide font-semibold text-gray-400 dark:text-gray-400">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span className="text-xs tracking-wide font-semibold text-gray-400 dark:text-gray-400">
              {getStepTitle(currentStep)}
            </span>
          </div>
          <div
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-label={`Progress: step ${currentStep} of ${TOTAL_STEPS}`}
          >
            <div
              className="bg-gray-900 dark:bg-gray-100 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">

          {/* ── Step 1: Basic info ── */}
          {currentStep === 1 && (
            <fieldset>
              <legend className="sr-only">Basic Information</legend>
              <div className="space-y-6">
                <div>
                  <Input
                    id="bodyweight"
                    label="Your bodyweight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={bodyweight}
                    onChange={(e) => setBodyweight(e.target.value)}
                    hint="Used to calculate strength standards and track progress"
                    placeholder="e.g., 180"
                    required
                    aria-required="true"
                  />
                </div>

                <fieldset>
                  <legend className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Unit preference <span className="text-red-600" aria-label="required">*</span>
                  </legend>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="unit"
                        value="lb"
                        checked={unitPreference === 'lb'}
                        onChange={(e) => setUnitPreference(e.target.value as 'lb' | 'kg')}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">Pounds (lb)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="unit"
                        value="kg"
                        checked={unitPreference === 'kg'}
                        onChange={(e) => setUnitPreference(e.target.value as 'lb' | 'kg')}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">Kilograms (kg)</span>
                    </label>
                  </div>
                </fieldset>

                <Select
                  id="gender-select"
                  label="Gender"
                  value={gender}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                  onChange={(val) => setGender(val as string)}
                  description="Used to calculate accurate strength scores"
                  required
                />
              </div>
            </fieldset>
          )}

          {/* ── Step 2: Starting maxes ── */}
          {currentStep === 2 && (
            <fieldset>
              <legend className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                Enter Your Starting Maxes
              </legend>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter at least one lift. Use the calculator if you need help estimating your 1RM.
              </p>

              <div className="space-y-6">
                {(Object.keys(liftInfo) as MainLift[]).map((lift) => {
                  const info = liftInfo[lift];
                  const calc = calculators[lift];
                  const isCalculatorActive = activeCalculator === lift;

                  return (
                    <div key={lift} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{info.name}</h3>

                      <div className="space-y-4">
                        <div>
                          <Input
                            id={`${lift}-max`}
                            label={`1 Rep Max (${unitPreference})`}
                            type="number"
                            step="0.5"
                            min="0"
                            value={info.value}
                            onChange={(e) => info.setter(e.target.value)}
                            placeholder={`e.g., ${info.placeholder}`}
                            disabled={isCalculatorActive}
                            aria-label={`${info.name} one rep max in ${unitPreference}`}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={<Calculator className="w-4 h-4" aria-hidden="true" />}
                          onClick={() => setActiveCalculator(isCalculatorActive ? null : lift)}
                          aria-expanded={isCalculatorActive}
                          aria-controls={`${lift}-calculator`}
                        >
                          {isCalculatorActive ? 'Close Calculator' : 'Use Calculator'}
                        </Button>

                        {isCalculatorActive && (
                          <div id={`${lift}-calculator`} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4" role="region" aria-label={`Calculator for ${info.name}`}>
                            <fieldset>
                              <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Calculate 1RM from a recent set
                              </legend>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label htmlFor={`${lift}-calc-weight`} className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Weight lifted ({unitPreference})
                                  </label>
                                  <input
                                    id={`${lift}-calc-weight`}
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={calc.weight}
                                    onChange={(e) => setCalculators({ ...calculators, [lift]: { ...calc, weight: e.target.value } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 275"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`${lift}-calc-reps`} className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Reps completed
                                  </label>
                                  <input
                                    id={`${lift}-calc-reps`}
                                    type="number"
                                    min="1"
                                    value={calc.reps}
                                    onChange={(e) => setCalculators({ ...calculators, [lift]: { ...calc, reps: e.target.value } })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 5"
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                fullWidth
                                size="sm"
                                onClick={() => handleCalculate(lift)}
                                disabled={!calc.weight || !calc.reps}
                                className="mt-3"
                              >
                                Calculate
                              </Button>
                            </fieldset>

                            {calc.calculatedMax !== null && (
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-4" role="status" aria-live="polite">
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  Estimated 1RM: <span className="font-semibold">{calc.calculatedMax} {unitPreference}</span>
                                </p>
                                <Button
                                  type="button"
                                  fullWidth
                                  size="sm"
                                  onClick={() => handleUseCalculatedValue(lift)}
                                >
                                  Use This Value
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!hasAtLeastOneLift && (
                <div className="mt-4 text-sm text-amber-600 dark:text-amber-400" role="alert" aria-live="polite">
                  Please enter at least one lift to continue
                </div>
              )}
            </fieldset>
          )}

          {/* ── Step 3: Meet / test date ── */}
          {currentStep === 3 && (
            <fieldset>
              <legend className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                When's your next meet or 1RM test?
              </legend>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                The app will build your wave schedule backwards from this date. You can skip this and set it later in your profile.
              </p>

              <div className="space-y-4">
                <div>
                  <Input
                    id="meet-date"
                    label="Target date"
                    type="date"
                    value={meetDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setMeetDate(e.target.value)}
                  />
                  {weeksAway !== null && weeksAway > 0 && (
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2 tabular-nums">
                      {weeksAway} week{weeksAway !== 1 ? 's' : ''} away
                    </p>
                  )}
                  {weeksAway !== null && weeksAway <= 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                      Date must be in the future
                    </p>
                  )}
                </div>

                {meetDate && weeksAway !== null && weeksAway > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-xs tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Program Structure</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {weeksAway >= 12
                        ? `Full program: 10-rep → 8-rep → 5-rep → 3-rep waves`
                        : weeksAway >= 9
                          ? `10-rep wave skipped; 8-rep → 5-rep → 3-rep waves`
                          : weeksAway >= 6
                            ? `5-rep → 3-rep waves only`
                            : weeksAway >= 3
                              ? `3-rep wave only (peaking block)`
                              : 'Not enough time for a full wave — consider a later date'}
                    </p>
                  </div>
                )}
              </div>
            </fieldset>
          )}

          {/* ── Step 4: Weak points ── */}
          {currentStep === 4 && (
            <fieldset>
              <legend className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                Where do you struggle?
              </legend>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Select your sticking points per lift. The app will prescribe accessories that target those zones. You can skip this and set it later in your profile.
              </p>

              <div className="space-y-6">
                {(Object.keys(LIFT_LABELS) as MainLift[]).map((lift) => (
                  <div key={lift}>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{LIFT_LABELS[lift]}</h3>
                    <div className="flex gap-2">
                      {STICKING_POINTS.map((point) => {
                        const active = weakPoints[lift].includes(point);
                        return (
                          <button
                            key={point}
                            type="button"
                            onClick={() => toggleWeakPoint(lift, point)}
                            className={`flex-1 py-2.5 px-3 rounded-xl border-2 transition-colors text-left ${
                              active
                                ? 'bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900'
                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                          >
                            <span className="block text-sm font-semibold">{STICKING_POINT_LABELS[point]}</span>
                            <span className="block text-xs font-normal opacity-60 mt-0.5">{STICKING_POINT_DESCRIPTIONS[point]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handlePreviousStep}
              >
                Back
              </Button>
            )}

            {currentStep < TOTAL_STEPS && (
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !hasAtLeastOneLift)
                }
              >
                {currentStep === 3 || currentStep === 4 ? (meetDate || Object.values(weakPoints).some(a => a.length > 0) ? 'Next' : 'Skip') : 'Next'}
              </Button>
            )}

            {currentStep === TOTAL_STEPS && (
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={loading || !hasAtLeastOneLift}
                aria-busy={loading}
              >
                {loading ? 'Setting up your program...' : 'Start Training'}
              </Button>
            )}
          </div>

          {currentStep === TOTAL_STEPS && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can adjust everything anytime in your profile
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
