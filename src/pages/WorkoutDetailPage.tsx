import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculateWorkoutWeights, calculateOneRepMax } from '../lib/calculations';
import { supabase } from '../lib/supabase';
import { useConfetti } from '../hooks/useAnimations';
import WorkoutSuccessModal from '../components/WorkoutSuccessModal';
import ExerciseSubstitutionModal from '../components/ExerciseSubstitutionModal';

interface WorkoutDetailPageProps {
  liftType: string;
  onBack: () => void;
  onNavigateToProgress: () => void;
}

interface ExerciseData {
  name: string;
  reps: string;
  sets: { reps: string; weight: string }[];
}

type WorkoutStep = 'summary' | 'main' | number;

export default function WorkoutDetailPage({ liftType, onBack, onNavigateToProgress }: WorkoutDetailPageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WorkoutStep>('summary');
  const [saving, setSaving] = useState(false);
  const celebrate = useConfetti();

  const [mainSets, setMainSets] = useState([
    { reps: '', weight: '' },
    { reps: '', weight: '' },
    { reps: '', weight: '' },
  ]);
  const [initialMainSetsSet, setInitialMainSetsSet] = useState(false);

  const [accessoryData, setAccessoryData] = useState<{ [key: number]: { reps: string; weight: string }[] }>({});
  const [lastMainLift, setLastMainLift] = useState<{ weight: number; reps: number } | null>(null);
  const [lastAccessoryData, setLastAccessoryData] = useState<{ [key: string]: { reps: string; weight: string }[] }>({});
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [workoutStats, setWorkoutStats] = useState<{ estimated1RM: number; totalTonnage: number }>({ estimated1RM: 0, totalTonnage: 0 });
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ exerciseIndex: number; exerciseName: string } | null>(null);
  const [exerciseSubstitutions, setExerciseSubstitutions] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (user) {
      loadLastWorkoutData();
    }
  }, [user, liftType]);

  useEffect(() => {
    if (!loading && profile && !initialMainSetsSet) {
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

      const mainReps = profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5;

      setMainSets([
        { reps: String(mainReps), weight: String(weights.set1) },
        { reps: String(mainReps), weight: String(weights.set2) },
        { reps: String(mainReps), weight: String(weights.set3) },
      ]);
      setInitialMainSetsSet(true);
    }
  }, [loading, profile, initialMainSetsSet, liftType]);

  useEffect(() => {
    if (!loading && Object.keys(lastAccessoryData).length > 0) {
      const currentExercises = baseExercises[liftType as keyof typeof baseExercises];
      const initialAccessoryData: { [key: number]: { reps: string; weight: string }[] } = {};
      currentExercises.forEach((exercise, index) => {
        const lastData = lastAccessoryData[exercise.name];
        if (lastData && lastData.length > 0) {
          initialAccessoryData[index] = lastData.map(set => ({
            reps: set.reps || '',
            weight: set.weight || ''
          }));
        }
      });
      if (Object.keys(initialAccessoryData).length > 0) {
        setAccessoryData(prev => {
          const merged = { ...initialAccessoryData };
          Object.keys(prev).forEach(key => {
            if (prev[parseInt(key)].some(set => set.reps || set.weight)) {
              merged[parseInt(key)] = prev[parseInt(key)];
            }
          });
          return merged;
        });
      }
    }
  }, [loading, lastAccessoryData, liftType]);

  const loadLastWorkoutData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('lift_type', liftType)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setLastMainLift({
          weight: sessionData.weight_lifted,
          reps: sessionData.reps_performed,
        });

        const { data: accessoryData } = await supabase
          .from('accessory_exercises')
          .select('*')
          .eq('workout_session_id', sessionData.id)
          .order('exercise_order', { ascending: true });

        if (accessoryData) {
          const formattedData: { [key: string]: { reps: string; weight: string }[] } = {};
          accessoryData.forEach(exercise => {
            formattedData[exercise.exercise_name] = exercise.sets_data as { reps: string; weight: string }[];
          });
          setLastAccessoryData(formattedData);
        }
      }
    } catch (error) {
      console.error('Error loading last workout:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const baseExercises = {
    squat: [
      { name: 'Romanian Deadlift', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Bulgarian Split Squats', reps: '8-10', sets: 3, isBodyweight: false },
      { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
      { name: 'Plank', reps: '30-60 sec', sets: 3, isBodyweight: true },
    ],
    bench: [
      { name: 'Incline DB Press', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Barbell Curls', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Tricep Pressdowns', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
    ],
    deadlift: [
      { name: 'Leg Press', reps: '5-8', sets: 3, isBodyweight: false },
      { name: 'B Stance RDLs', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Abs', reps: '10-15 min', sets: 3, isBodyweight: true },
    ],
    ohp: [
      { name: 'Close-Grip Bench', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Lat Pull-Overs', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Lateral Raise Complex', reps: '12-15', sets: 3, isBodyweight: false },
      { name: 'Rear Delt Flyes', reps: '10-15', sets: 3, isBodyweight: false },
    ],
  };

  const exercises = {
    squat: baseExercises.squat.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
    bench: baseExercises.bench.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
    deadlift: baseExercises.deadlift.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
    ohp: baseExercises.ohp.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
  };

  const currentExercises = exercises[liftType as keyof typeof exercises];
  const totalSteps = 1 + currentExercises.length;

  const isDeloadWeek = profile.current_week === 4;
  const mainReps = profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5;

  const getLastSetData = (exerciseName: string) => {
    if (exerciseName === 'main') {
      if (loading) return 'Loading...';
      if (!lastMainLift) return 'No previous data';
      return `${lastMainLift.weight}lb for ${lastMainLift.reps} reps`;
    }

    if (loading) return 'Loading...';
    const lastData = lastAccessoryData[exerciseName];
    if (!lastData || lastData.length === 0) return 'No previous data';

    const firstSet = lastData[0];
    return `${firstSet.weight || '0'}lb × ${firstSet.reps || '0'} reps (${lastData.length} sets)`;
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

  const addAccessorySet = (exerciseIndex: number) => {
    const exerciseSets = accessoryData[exerciseIndex] || Array(3).fill({ reps: '', weight: '' }).map(() => ({ reps: '', weight: '' }));
    const newSets = [...exerciseSets, { reps: '', weight: '' }];
    setAccessoryData({ ...accessoryData, [exerciseIndex]: newSets });
  };

  const removeAccessorySet = (exerciseIndex: number, setIndex: number) => {
    const exerciseSets = accessoryData[exerciseIndex] || Array(3).fill({ reps: '', weight: '' }).map(() => ({ reps: '', weight: '' }));
    if (exerciseSets.length <= 1) return;
    const newSets = exerciseSets.filter((_, idx) => idx !== setIndex);
    setAccessoryData({ ...accessoryData, [exerciseIndex]: newSets });
  };

  const calculateTotalTonnage = () => {
    let tonnage = 0;

    mainSets.forEach(set => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps) || 0;
      tonnage += weight * reps;
    });

    Object.values(accessoryData).forEach(sets => {
      sets.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        tonnage += weight * reps;
      });
    });

    return tonnage;
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const amrapWeight = parseFloat(mainSets[2].weight);
      const amrapReps = parseInt(mainSets[2].reps);

      if (amrapWeight && amrapReps) {
        const calculated1RM = calculateOneRepMax(amrapWeight, amrapReps);
        const totalTonnage = calculateTotalTonnage();

        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            lift_type: liftType,
            cycle: profile.current_cycle,
            week: profile.current_week,
            weight_lifted: amrapWeight,
            reps_performed: amrapReps,
            calculated_1rm: calculated1RM,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        const accessoryInserts = Object.entries(accessoryData)
          .filter(([_, sets]) => sets.some(set => set.reps || set.weight))
          .map(([exerciseIndex, sets]) => ({
            workout_session_id: sessionData.id,
            exercise_name: currentExercises[parseInt(exerciseIndex)].name,
            exercise_order: parseInt(exerciseIndex),
            sets_data: sets,
          }));

        if (accessoryInserts.length > 0) {
          const { error: accessoryError } = await supabase
            .from('accessory_exercises')
            .insert(accessoryInserts);

          if (accessoryError) throw accessoryError;
        }

        setWorkoutStats({ estimated1RM: calculated1RM, totalTonnage });
        celebrate(40);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessClose = async () => {
    setShowSuccessModal(false);
    await refreshProfile();
    onNavigateToProgress();
  };

  const handleOpenSubstitution = (exerciseIndex: number, exerciseName: string) => {
    const baseExercise = baseExercises[liftType as keyof typeof baseExercises][exerciseIndex];
    setSubstitutionTarget({ exerciseIndex, exerciseName: baseExercise.name });
    setShowSubstitutionModal(true);
  };

  const handleSubstitute = (newExercise: string) => {
    if (substitutionTarget) {
      setExerciseSubstitutions({
        ...exerciseSubstitutions,
        [substitutionTarget.exerciseIndex]: newExercise,
      });
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
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateMainSet(index, 'reps', e.target.value)}
                  placeholder={index === 2 ? `${mainReps}+` : String(mainReps)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
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
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{currentExercise.name}</h2>
              {exerciseSubstitutions[exerciseIndex] && (
                <p className="text-xs text-gray-500 mt-1">
                  Substituted from: {baseExercises[liftType as keyof typeof baseExercises][exerciseIndex].name}
                </p>
              )}
            </div>
            <button
              onClick={() => handleOpenSubstitution(exerciseIndex, currentExercise.name)}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
              aria-label="Substitute exercise"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium">Substitute</span>
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">Last Set: {getLastSetData(currentExercise.name)}</p>
          <p className="text-sm font-medium text-blue-600 mb-6">{currentExercise.sets} sets of {currentExercise.reps} reps</p>

          {currentExercise.isBodyweight ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
              </div>
              {exerciseSets.map((set, index) => (
                <div key={index} className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={set.reps}
                    onChange={(e) => updateAccessorySet(exerciseIndex, index, 'reps', e.target.value)}
                    placeholder={currentExercise.reps}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {exerciseSets.length > 1 && (
                    <button
                      onClick={() => removeAccessorySet(exerciseIndex, index)}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      aria-label="Remove set"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addAccessorySet(exerciseIndex)}
                className="w-full flex items-center justify-center gap-2 py-3 text-blue-600 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Set</span>
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
                </div>
              </div>
              {exerciseSets.map((set, index) => (
                <div key={index} className="flex gap-2 mb-4">
                  <div className="grid grid-cols-2 gap-4 flex-1">
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
                      placeholder="0lb"
                      className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {exerciseSets.length > 1 && (
                    <button
                      onClick={() => removeAccessorySet(exerciseIndex, index)}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      aria-label="Remove set"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addAccessorySet(exerciseIndex)}
                className="w-full flex items-center justify-center gap-2 py-3 text-blue-600 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Set</span>
              </button>
            </>
          )}
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
            className={`flex-1 py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
              nextExercise
                ? 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {nextExercise ? `Next: ${nextExercise}` : saving ? 'Saving...' : 'Complete Workout'}
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <WorkoutSuccessModal
          liftName={liftNames[liftType]}
          estimated1RM={workoutStats.estimated1RM}
          totalTonnage={workoutStats.totalTonnage}
          onClose={handleSuccessClose}
        />
      )}
      {showSubstitutionModal && substitutionTarget && (
        <ExerciseSubstitutionModal
          isOpen={showSubstitutionModal}
          onClose={() => setShowSubstitutionModal(false)}
          currentExercise={substitutionTarget.exerciseName}
          onSubstitute={handleSubstitute}
        />
      )}
    </div>
  );
}
