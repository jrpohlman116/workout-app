import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculateWorkoutWeights, calculateOneRepMax } from '../lib/calculations';
import { supabase } from '../lib/supabase';
import { useConfetti } from '../hooks/useAnimations';

interface WorkoutDetailPageProps {
  liftType: string;
  onBack: () => void;
}

interface ExerciseData {
  name: string;
  reps: string;
  sets: { reps: string; weight: string }[];
}

type WorkoutStep = 'summary' | 'main' | number;

export default function WorkoutDetailPage({ liftType, onBack }: WorkoutDetailPageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WorkoutStep>('summary');
  const [saving, setSaving] = useState(false);
  const celebrate = useConfetti();

  const [mainSets, setMainSets] = useState([
    { reps: '', weight: '' },
    { reps: '', weight: '' },
    { reps: '', weight: '' },
  ]);

  const [accessoryData, setAccessoryData] = useState<{ [key: number]: { reps: string; weight: string }[] }>({});

  if (!profile) return null;

  const liftNames: Record<string, string> = {
    squat: 'Squat',
    bench: 'Bench Press',
    deadlift: 'Deadlift',
    ohp: 'Overhead Press',
  };

  const liftNamesShort: Record<string, string> = {
    squat: 'Squat',
    bench: 'Benchpress',
    deadlift: 'Deadlift',
    ohp: 'Overhead Press',
  };

  const maxes: Record<string, number> = {
    squat: profile.squat_max,
    bench: profile.bench_max,
    deadlift: profile.deadlift_max,
    ohp: profile.ohp_max,
  };

  const weights = calculateWorkoutWeights(
    liftType,
    maxes[liftType],
    profile.current_cycle,
    profile.current_week
  );

  const exercises = {
    squat: [
      { name: 'Romanian Deadlift', reps: '8-12', sets: 3 },
      { name: 'Bulgarian Split Squats', reps: '8-10', sets: 3 },
      { name: 'Leg Curls', reps: '12-15', sets: 3 },
      { name: 'Plank', reps: '30-60 sec', sets: 3 },
    ],
    bench: [
      { name: 'Incline DB Press', reps: '8-12', sets: 3 },
      { name: 'Barbell Curls', reps: '8-12', sets: 3 },
      { name: 'Tricep Pressdowns', reps: '8-12', sets: 3 },
      { name: 'Face Pulls', reps: '15-20', sets: 3 },
    ],
    deadlift: [
      { name: 'Leg Press', reps: '5-8', sets: 3 },
      { name: 'B Stance RDLs', reps: '8-12', sets: 3 },
      { name: 'Barbell Rows', reps: '8-12', sets: 3 },
      { name: 'Abs', reps: '10-15 min', sets: 3 },
    ],
    ohp: [
      { name: 'Close-Grip Bench', reps: '8-12', sets: 3 },
      { name: 'Lat Pull-Overs', reps: '8-12', sets: 3 },
      { name: 'Lateral Raise Complex', reps: '12-15', sets: 3 },
      { name: 'Rear Delt Flyes', reps: '10-15', sets: 3 },
    ],
  };

  const currentExercises = exercises[liftType as keyof typeof exercises];
  const totalSteps = 1 + currentExercises.length;

  const isDeloadWeek = profile.current_week === 4;
  const mainReps = profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5;

  const getLastSetData = (exerciseName: string) => {
    return 'No previous data';
  };

  const getProgressPercentage = () => {
    if (currentStep === 'summary') return 0;
    if (currentStep === 'main') return (1 / totalSteps) * 100;
    return ((currentStep as number + 2) / totalSteps) * 100;
  };

  const getCurrentExercise = () => {
    if (typeof currentStep === 'number') {
      return currentExercises[currentStep];
    }
    return null;
  };

  const getNextExerciseName = () => {
    if (currentStep === 'summary') return liftNamesShort[liftType];
    if (currentStep === 'main') {
      return currentExercises[0]?.name;
    }
    const nextIndex = (currentStep as number) + 1;
    if (nextIndex < currentExercises.length) {
      return currentExercises[nextIndex].name;
    }
    return null;
  };

  const handleNext = () => {
    if (currentStep === 'summary') {
      setCurrentStep('main');
    } else if (currentStep === 'main') {
      setCurrentStep(0);
    } else if (typeof currentStep === 'number') {
      if (currentStep < currentExercises.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'main') {
      setCurrentStep('summary');
    } else if (currentStep === 0) {
      setCurrentStep('main');
    } else if (typeof currentStep === 'number') {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateMainSet = (index: number, field: 'reps' | 'weight', value: string) => {
    const newSets = [...mainSets];
    newSets[index][field] = value;
    setMainSets(newSets);
  };

  const updateAccessorySet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const exerciseSets = accessoryData[exerciseIndex] || Array(3).fill({ reps: '', weight: '' }).map(() => ({ reps: '', weight: '' }));
    const newSets = [...exerciseSets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    setAccessoryData({ ...accessoryData, [exerciseIndex]: newSets });
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const amrapWeight = parseFloat(mainSets[2].weight);
      const amrapReps = parseInt(mainSets[2].reps);

      if (amrapWeight && amrapReps) {
        const calculated1RM = calculateOneRepMax(amrapWeight, amrapReps);

        await supabase.from('workout_sessions').insert({
          user_id: user.id,
          lift_type: liftType,
          cycle: profile.current_cycle,
          week: profile.current_week,
          weight_lifted: amrapWeight,
          reps_performed: amrapReps,
          calculated_1rm: calculated1RM,
        });
      }

      celebrate(40);
      setTimeout(async () => {
        await refreshProfile();
        onBack();
      }, 800);
    } catch (error) {
      console.error('Error saving workout:', error);
    } finally {
      setSaving(false);
    }
  };

  if (currentStep === 'summary') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white">
          <div className="max-w-md mx-auto px-4 pt-8 pb-6">
            <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-1">{liftNames[liftType]} Day</h1>
            <p className="text-gray-600">Week {profile.current_week} - Cycle {profile.current_cycle}</p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Main Sets</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-medium text-gray-700">Set 1</span>
                <span className="font-bold text-gray-900">{weights.set1} lb × {mainReps}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="font-medium text-gray-700">Set 2</span>
                <span className="font-bold text-gray-900">{weights.set2} lb × {mainReps}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-blue-50 rounded-xl px-4 border-2 border-blue-600">
                <div>
                  <span className="font-medium text-gray-900">Set 3 - AMRAP</span>
                  <p className="text-xs text-gray-600 mt-0.5">As Many Reps As Possible</p>
                </div>
                <span className="font-bold text-gray-900">{weights.set3} lb × {mainReps}+</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">Push yourself on this final set!</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Accessory Exercises</h2>
            <div className="space-y-2">
              {currentExercises.map((exercise, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-900 font-medium">{exercise.name}</span>
                  <span className="text-sm text-gray-600">{exercise.reps}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Workout
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(getProgressPercentage());
  const nextExercise = getNextExerciseName();

  if (currentStep === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white">
          <div className="max-w-md mx-auto px-4 pt-8 pb-6">
            <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-1">{liftNames[liftType]} Day</h1>
            <p className="text-gray-600">Week {profile.current_week} - Cycle {profile.current_cycle}</p>
          </div>

          <div className="max-w-md mx-auto px-4 pb-4">
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className="absolute -top-8 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded transition-all duration-300"
                style={{ left: `calc(${progressPercent}% - 20px)` }}
              >
                {progressPercent}%
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Barbell {liftNames[liftType]}</h2>
            <p className="text-sm text-gray-600 mb-6">Last Set: {getLastSetData('main')}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
              </div>
            </div>

            {mainSets.map((set, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={set.reps}
                  onChange={(e) => updateMainSet(index, 'reps', e.target.value)}
                  placeholder={index === 2 ? `${mainReps}+` : String(mainReps)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={set.weight}
                  onChange={(e) => updateMainSet(index, 'weight', e.target.value)}
                  placeholder={`${index === 0 ? weights.set1 : index === 1 ? weights.set2 : weights.set3}lb`}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-white text-blue-600 border-2 border-blue-600 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            Next: {nextExercise}
          </button>
        </div>
      </div>
    );
  }

  const currentExercise = getCurrentExercise();
  if (!currentExercise) return null;

  const exerciseIndex = currentStep as number;
  const exerciseSets = accessoryData[exerciseIndex] || Array(currentExercise.sets).fill(null).map(() => ({ reps: '', weight: '' }));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">{liftNames[liftType]} Day</h1>
          <p className="text-gray-600">Week {profile.current_week} - Cycle {profile.current_cycle}</p>
        </div>

        <div className="max-w-md mx-auto px-4 pb-4">
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className="absolute -top-8 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded transition-all duration-300"
              style={{ left: `calc(${progressPercent}% - 20px)` }}
            >
              {progressPercent}%
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{currentExercise.name}</h2>
          <p className="text-sm text-gray-600 mb-6">Last Set: {getLastSetData(currentExercise.name)}</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
            </div>
          </div>

          {exerciseSets.map((set, index) => (
            <div key={index} className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={set.reps}
                onChange={(e) => updateAccessorySet(exerciseIndex, index, 'reps', e.target.value)}
                placeholder={currentExercise.reps}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={set.weight}
                onChange={(e) => updateAccessorySet(exerciseIndex, index, 'weight', e.target.value)}
                placeholder={currentExercise.name.toLowerCase().includes('plank') || currentExercise.name.toLowerCase().includes('abs') ? '-' : '0lb'}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            className="flex-1 bg-white text-blue-600 border-2 border-blue-600 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 bg-white text-blue-600 border-2 border-blue-600 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {nextExercise ? `Next: ${nextExercise}` : saving ? 'Saving...' : 'Complete Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
