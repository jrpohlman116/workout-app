import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateOneRepMax } from '../../lib/calculations';
import AccessibleNativeSelect from '../accessible/AccessibleNativeSelect';
import { Calculator } from 'lucide-react';

type ProgramVariation = 'standard' | 'bbb' | 'bbs';
type LiftType = 'squat' | 'bench' | 'deadlift' | 'ohp';

interface LiftCalculatorState {
  weight: string;
  reps: string;
  calculatedMax: number | null;
}

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [bodyweight, setBodyweight] = useState('');
  const [unitPreference, setUnitPreference] = useState<'lb' | 'kg'>('lb');
  const [gender, setGender] = useState('male');
  const [programVariation, setProgramVariation] = useState<ProgramVariation>('standard');
  const [squatMax, setSquatMax] = useState('');
  const [benchMax, setBenchMax] = useState('');
  const [deadliftMax, setDeadliftMax] = useState('');
  const [ohpMax, setOhpMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState<LiftType | null>(null);
  const [calculators, setCalculators] = useState<Record<LiftType, LiftCalculatorState>>({
    squat: { weight: '', reps: '', calculatedMax: null },
    bench: { weight: '', reps: '', calculatedMax: null },
    deadlift: { weight: '', reps: '', calculatedMax: null },
    ohp: { weight: '', reps: '', calculatedMax: null },
  });
  const [announceMessage, setAnnounceMessage] = useState('');

  useEffect(() => {
    if (announceMessage) {
      const timer = setTimeout(() => setAnnounceMessage(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announceMessage]);

  const announce = (message: string) => {
    setAnnounceMessage(message);
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      announce(`Step ${currentStep + 1} of 3: ${getStepTitle(currentStep + 1)}`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      announce(`Step ${currentStep - 1} of 3: ${getStepTitle(currentStep - 1)}`);
    }
  };

  const getStepTitle = (step: number) => {
    if (step === 1) return 'Basic Information';
    if (step === 2) return 'Choose Your Program';
    return 'Enter Your Starting Maxes';
  };

  const canProceedFromStep1 = bodyweight !== '' && unitPreference !== '';
  const canProceedFromStep2 = programVariation !== '';
  const hasAtLeastOneLift = squatMax !== '' || benchMax !== '' || deadliftMax !== '' || ohpMax !== '';

  const handleCalculate = (lift: LiftType) => {
    const calc = calculators[lift];
    const weight = parseFloat(calc.weight);
    const reps = parseInt(calc.reps);

    if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps >= 1) {
      const calculated = calculateOneRepMax(weight, reps);
      setCalculators({
        ...calculators,
        [lift]: { ...calc, calculatedMax: calculated }
      });
      announce(`Calculated 1 rep max: ${calculated} ${unitPreference}`);
    }
  };

  const handleUseCalculatedValue = (lift: LiftType) => {
    const calc = calculators[lift];
    if (calc.calculatedMax !== null) {
      const value = calc.calculatedMax.toString();
      if (lift === 'squat') setSquatMax(value);
      else if (lift === 'bench') setBenchMax(value);
      else if (lift === 'deadlift') setDeadliftMax(value);
      else if (lift === 'ohp') setOhpMax(value);

      setActiveCalculator(null);
      announce(`${lift} max set to ${calc.calculatedMax} ${unitPreference}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasAtLeastOneLift) return;

    setLoading(true);
    announce('Setting up your program');

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .update({
          bodyweight: parseFloat(bodyweight) || 0,
          unit_preference: unitPreference,
          gender: gender,
          program_variation: programVariation,
          squat_max: parseFloat(squatMax) || 0,
          bench_max: parseFloat(benchMax) || 0,
          deadlift_max: parseFloat(deadliftMax) || 0,
          ohp_max: parseFloat(ohpMax) || 0,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) throw profileError;

      const initialMaxes = [
        { lift_type: 'squat', max: parseFloat(squatMax) || 0 },
        { lift_type: 'bench', max: parseFloat(benchMax) || 0 },
        { lift_type: 'deadlift', max: parseFloat(deadliftMax) || 0 },
        { lift_type: 'ohp', max: parseFloat(ohpMax) || 0 },
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

  const liftInfo = {
    squat: { name: 'Squat', value: squatMax, setter: setSquatMax },
    bench: { name: 'Bench Press', value: benchMax, setter: setBenchMax },
    deadlift: { name: 'Deadlift', value: deadliftMax, setter: setDeadliftMax },
    ohp: { name: 'Overhead Press', value: ohpMax, setter: setOhpMax },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to 5-3-1
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Let's personalize your strength training program
          </p>
        </div>

        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announceMessage}
        </div>

        <div className="mb-6" role="group" aria-label="Progress indicator">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep} of 3
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getStepTitle(currentStep)}
            </span>
          </div>
          <div
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={3}
            aria-label={`Progress: step ${currentStep} of 3`}
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
          {currentStep === 1 && (
            <fieldset>
              <legend className="sr-only">Basic Information</legend>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="bodyweight"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
                  >
                    Your bodyweight <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <p id="bodyweight-description" className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Used to calculate strength standards and track progress
                  </p>
                  <input
                    id="bodyweight"
                    type="number"
                    step="0.1"
                    value={bodyweight}
                    onChange={(e) => setBodyweight(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 180"
                    required
                    aria-describedby="bodyweight-description"
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
                        aria-required="true"
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
                        aria-required="true"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">Kilograms (kg)</span>
                    </label>
                  </div>
                </fieldset>

                <div>
                  <AccessibleNativeSelect
                    id="gender-select"
                    label="Gender"
                    value={gender}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' }
                    ]}
                    onChange={setGender}
                    description="Used to calculate accurate strength scores"
                    required
                  />
                </div>
              </div>
            </fieldset>
          )}

          {currentStep === 2 && (
            <fieldset>
              <legend className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What's your main goal?
              </legend>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                You can change this anytime in your profile settings
              </p>

              <div className="space-y-4" role="radiogroup" aria-label="Program variation">
                <label
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    programVariation === 'standard'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="program"
                      value="standard"
                      checked={programVariation === 'standard'}
                      onChange={(e) => setProgramVariation(e.target.value as ProgramVariation)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      aria-describedby="standard-description"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Standard 5-3-1
                      </div>
                      <p id="standard-description" className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Traditional program with main lift plus 4 accessory exercises. Best for balanced strength and muscle development.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    programVariation === 'bbb'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="program"
                      value="bbb"
                      checked={programVariation === 'bbb'}
                      onChange={(e) => setProgramVariation(e.target.value as ProgramVariation)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      aria-describedby="bbb-description"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Boring But Big (BBB)
                      </div>
                      <p id="bbb-description" className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Main lift plus 5 sets of 10 reps at 50% training max. Focused on building muscle mass and work capacity.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    programVariation === 'bbs'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="program"
                      value="bbs"
                      checked={programVariation === 'bbs'}
                      onChange={(e) => setProgramVariation(e.target.value as ProgramVariation)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      aria-describedby="bbs-description"
                    />
                    <div className="ml-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Boring But Strong (BBS)
                      </div>
                      <p id="bbs-description" className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Main lift plus 10 sets of 5 reps. Emphasizes strength development with more practice at heavier weights.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </fieldset>
          )}

          {currentStep === 3 && (
            <fieldset>
              <legend className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Enter Your Starting Maxes
              </legend>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter at least one lift to continue. Use the calculator if you need help estimating your 1RM.
              </p>

              <div className="space-y-6">
                {(Object.keys(liftInfo) as LiftType[]).map((lift) => {
                  const info = liftInfo[lift];
                  const calc = calculators[lift];
                  const isCalculatorActive = activeCalculator === lift;

                  return (
                    <div key={lift} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        {info.name}
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor={`${lift}-max`}
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                          >
                            1 Rep Max ({unitPreference})
                          </label>
                          <input
                            id={`${lift}-max`}
                            type="number"
                            step="0.1"
                            value={info.value}
                            onChange={(e) => info.setter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`e.g., ${lift === 'squat' ? '315' : lift === 'bench' ? '225' : lift === 'deadlift' ? '405' : '135'}`}
                            disabled={isCalculatorActive}
                            aria-label={`${info.name} one rep max in ${unitPreference}`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveCalculator(isCalculatorActive ? null : lift)}
                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          aria-label={`${isCalculatorActive ? 'Close' : 'Open'} calculator for ${info.name}`}
                          aria-expanded={isCalculatorActive}
                          aria-controls={`${lift}-calculator`}
                        >
                          <Calculator className="w-4 h-4" aria-hidden="true" />
                          {isCalculatorActive ? 'Close Calculator' : 'Use Calculator'}
                        </button>

                        {isCalculatorActive && (
                          <div
                            id={`${lift}-calculator`}
                            className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4"
                            role="region"
                            aria-label={`Calculator for ${info.name}`}
                          >
                            <fieldset>
                              <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Calculate 1RM from a recent set
                              </legend>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label
                                    htmlFor={`${lift}-calc-weight`}
                                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                                  >
                                    Weight lifted ({unitPreference})
                                  </label>
                                  <input
                                    id={`${lift}-calc-weight`}
                                    type="number"
                                    step="0.1"
                                    value={calc.weight}
                                    onChange={(e) => setCalculators({
                                      ...calculators,
                                      [lift]: { ...calc, weight: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 275"
                                    aria-label={`Weight lifted for ${info.name}`}
                                  />
                                </div>
                                <div>
                                  <label
                                    htmlFor={`${lift}-calc-reps`}
                                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                                  >
                                    Reps completed
                                  </label>
                                  <input
                                    id={`${lift}-calc-reps`}
                                    type="number"
                                    min="1"
                                    value={calc.reps}
                                    onChange={(e) => setCalculators({
                                      ...calculators,
                                      [lift]: { ...calc, reps: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 5"
                                    aria-label={`Reps completed for ${info.name}`}
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCalculate(lift)}
                                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500"
                                disabled={!calc.weight || !calc.reps}
                                aria-label={`Calculate estimated 1 rep max for ${info.name}`}
                              >
                                Calculate
                              </button>
                            </fieldset>

                            {calc.calculatedMax !== null && (
                              <div
                                className="border-t border-gray-200 dark:border-gray-700 pt-4"
                                role="status"
                                aria-live="polite"
                              >
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  Estimated 1RM: <span className="font-semibold">{calc.calculatedMax} {unitPreference}</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleUseCalculatedValue(lift)}
                                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500"
                                  aria-label={`Use calculated value of ${calc.calculatedMax} ${unitPreference} for ${info.name}`}
                                >
                                  Use This Value
                                </button>
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
                <div
                  className="mt-4 text-sm text-amber-600 dark:text-amber-400"
                  role="alert"
                  aria-live="polite"
                >
                  Please enter at least one lift to continue
                </div>
              )}
            </fieldset>
          )}

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                className="flex-1 px-6 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500"
                aria-label={`Go back to step ${currentStep - 1}: ${getStepTitle(currentStep - 1)}`}
              >
                Back
              </button>
            )}

            {currentStep < 3 && (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500"
                aria-label={`Go to next step: ${getStepTitle(currentStep + 1)}`}
                aria-disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
              >
                Next
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="submit"
                disabled={loading || !hasAtLeastOneLift}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500"
                aria-label="Complete setup and start using the program"
                aria-disabled={loading || !hasAtLeastOneLift}
                aria-busy={loading}
              >
                {loading ? 'Setting up your program...' : 'Complete Setup'}
              </button>
            )}
          </div>

          {currentStep === 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can adjust these anytime in your profile settings
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
