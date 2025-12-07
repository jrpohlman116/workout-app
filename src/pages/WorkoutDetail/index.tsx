import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateWorkoutWeights, calculateOneRepMax, calculateBBBSupplementalWeight, calculateBBSSupplementalWeight, getSupplementalWorkConfig } from '../../lib/calculations';
import { supabase } from '../../lib/supabase';
import { useConfetti } from '../../hooks/useAnimations';
import WorkoutSuccessModal from '../../components/features/WorkoutSuccessModal';
import ExerciseSubstitutionModal from '../../components/features/ExerciseSubstitutionModal';
import AccessibleProgressIndicator from '../../components/accessible/AccessibleProgressIndicator';
import WorkoutHeader from './WorkoutHeader';
import WorkoutSummaryView from './WorkoutSummaryView';
import MainLiftView from './MainLiftView';
import SupplementalLiftView from './SupplementalLiftView';
import AccessoryExerciseView from './AccessoryExerciseView';
import { useWorkoutData } from './useWorkoutData';
import { liftNames, liftNamesShort, baseExercises, bbbExercises, bbsExercises } from './constants';
import { WorkoutDetailPageProps, WorkoutStep, SetInput } from './types';

export default function WorkoutDetailPage({ liftType, onBack, onNavigateToProgress }: WorkoutDetailPageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WorkoutStep>('summary');
  const [saving, setSaving] = useState(false);
  const celebrate = useConfetti();

  const [mainSets, setMainSets] = useState<SetInput[]>([
    { reps: '', weight: '' },
    { reps: '', weight: '' },
    { reps: '', weight: '' },
  ]);
  const [initialMainSetsSet, setInitialMainSetsSet] = useState(false);

  const [supplementalSets, setSupplementalSets] = useState<SetInput[]>([]);
  const [initialSupplementalSetsSet, setInitialSupplementalSetsSet] = useState(false);

  const [accessoryData, setAccessoryData] = useState<{ [key: number]: SetInput[] }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({ estimated1RM: 0, totalTonnage: 0 });
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ exerciseIndex: number; exerciseName: string } | null>(null);
  const [exerciseSubstitutions, setExerciseSubstitutions] = useState<{ [key: number]: string }>({});

  const { lastAccessoryData, loading, getLastSetData } = useWorkoutData(user?.id, liftType);

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
    if (!loading && profile && !initialSupplementalSetsSet) {
      const programVariation = profile.program_variation || 'standard';
      const supplementalConfig = getSupplementalWorkConfig(programVariation);

      if (supplementalConfig) {
        const maxes: Record<string, number> = {
          squat: profile.squat_max,
          bench: profile.bench_max,
          deadlift: profile.deadlift_max,
          ohp: profile.ohp_max,
        };

        let supplementalWeight = 0;
        if (programVariation === 'bbb') {
          supplementalWeight = calculateBBBSupplementalWeight(liftType, maxes[liftType], profile.current_cycle);
        } else if (programVariation === 'bbs') {
          supplementalWeight = calculateBBSSupplementalWeight(liftType, maxes[liftType], profile.current_cycle, profile.current_week);
        }

        const sets = Array(supplementalConfig.sets).fill(null).map(() => ({
          reps: String(supplementalConfig.reps),
          weight: String(supplementalWeight),
        }));

        setSupplementalSets(sets);
      }
      setInitialSupplementalSetsSet(true);
    }
  }, [loading, profile, initialSupplementalSetsSet, liftType]);

  useEffect(() => {
    if (!loading && Object.keys(lastAccessoryData).length > 0 && profile) {
      const programVariation = profile.program_variation || 'standard';
      let exerciseTemplate = baseExercises;
      if (programVariation === 'bbb') {
        exerciseTemplate = bbbExercises;
      } else if (programVariation === 'bbs') {
        exerciseTemplate = bbsExercises;
      }

      const currentExercises = exerciseTemplate[liftType as keyof typeof exerciseTemplate];
      const initialAccessoryData: { [key: number]: SetInput[] } = {};
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
  }, [loading, lastAccessoryData, liftType, profile]);

  if (!profile) return null;

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

  const programVariation = profile.program_variation || 'standard';
  let exerciseTemplate = baseExercises;
  if (programVariation === 'bbb') {
    exerciseTemplate = bbbExercises;
  } else if (programVariation === 'bbs') {
    exerciseTemplate = bbsExercises;
  }

  const exercises = {
    squat: exerciseTemplate.squat.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
    bench: exerciseTemplate.bench.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
    deadlift: exerciseTemplate.deadlift.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
    ohp: exerciseTemplate.ohp.map((ex, idx) => ({
      ...ex,
      name: exerciseSubstitutions[idx] || ex.name,
    })),
  };

  const currentExercises = exercises[liftType as keyof typeof exercises];
  const hasSupplemental = programVariation === 'bbb' || programVariation === 'bbs';
  const totalSteps = 1 + (hasSupplemental ? 1 : 0) + currentExercises.length;

  const mainReps = profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5;

  const getProgressPercentage = () => {
    if (currentStep === 'summary') return 0;
    if (currentStep === 'main') return (1 / totalSteps) * 100;
    if (currentStep === 'supplemental') return (2 / totalSteps) * 100;
    const offset = hasSupplemental ? 3 : 2;
    return ((currentStep as number + offset) / totalSteps) * 100;
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
      if (hasSupplemental) {
        return `Supplemental ${liftNamesShort[liftType]}`;
      }
      return currentExercises[0]?.name;
    }
    if (currentStep === 'supplemental') {
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
      if (hasSupplemental) {
        setCurrentStep('supplemental');
      } else {
        setCurrentStep(0);
      }
    } else if (currentStep === 'supplemental') {
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
    } else if (currentStep === 'supplemental') {
      setCurrentStep('main');
    } else if (currentStep === 0) {
      if (hasSupplemental) {
        setCurrentStep('supplemental');
      } else {
        setCurrentStep('main');
      }
    } else if (typeof currentStep === 'number') {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateMainSet = (index: number, field: 'reps' | 'weight', value: string) => {
    const newSets = [...mainSets];
    newSets[index][field] = value;
    setMainSets(newSets);
  };

  const updateSupplementalSet = (index: number, field: 'reps' | 'weight', value: string) => {
    const newSets = [...supplementalSets];
    newSets[index][field] = value;
    setSupplementalSets(newSets);
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

    if (hasSupplemental) {
      supplementalSets.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        tonnage += weight * reps;
      });
    }

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

        const allExerciseInserts = [];

        if (hasSupplemental && supplementalSets.length > 0) {
          const variationLabel = programVariation === 'bbb' ? 'BBB' : 'BBS';
          allExerciseInserts.push({
            workout_session_id: sessionData.id,
            exercise_name: `Supplemental ${liftNamesShort[liftType]} (${variationLabel})`,
            exercise_order: -1,
            sets_data: supplementalSets,
          });
        }

        const accessoryInserts = Object.entries(accessoryData)
          .filter(([_, sets]) => sets.some(set => set.reps || set.weight))
          .map(([exerciseIndex, sets]) => ({
            workout_session_id: sessionData.id,
            exercise_name: currentExercises[parseInt(exerciseIndex)].name,
            exercise_order: parseInt(exerciseIndex),
            sets_data: sets,
          }));

        allExerciseInserts.push(...accessoryInserts);

        if (allExerciseInserts.length > 0) {
          const { error: accessoryError } = await supabase
            .from('accessory_exercises')
            .insert(allExerciseInserts);

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

  const handleOpenSubstitution = (exerciseIndex: number) => {
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
        <div className="bg-white dark:bg-gray-800">
          <WorkoutHeader
            liftName={liftNames[liftType]}
            week={profile.current_week}
            cycle={profile.current_cycle}
            onBack={onBack}
          />
        </div>

        <WorkoutSummaryView
          mainWeights={weights}
          mainReps={mainReps}
          exercises={currentExercises}
          onStartWorkout={handleNext}
          programVariation={programVariation}
          supplementalWeight={
            programVariation === 'bbb'
              ? calculateBBBSupplementalWeight(liftType, maxes[liftType], profile.current_cycle)
              : programVariation === 'bbs'
              ? calculateBBSSupplementalWeight(liftType, maxes[liftType], profile.current_cycle, profile.current_week)
              : 0
          }
          supplementalConfig={getSupplementalWorkConfig(programVariation)}
        />
      </div>
    );
  }

  const nextExercise = getNextExerciseName();

  if (currentStep === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
        <div className="bg-white dark:bg-gray-800">
          <WorkoutHeader
            liftName={liftNames[liftType]}
            week={profile.current_week}
            cycle={profile.current_cycle}
            onBack={onBack}
          />

          <div className="max-w-md mx-auto px-4 pb-4">
            <AccessibleProgressIndicator
              current={1}
              total={totalSteps}
              label="Workout progress"
              variant="bar"
            />
          </div>
        </div>

        <MainLiftView
          liftName={liftNames[liftType]}
          mainSets={mainSets}
          mainReps={mainReps}
          unitPreference={profile.unit_preference || 'lb'}
          lastSetData={getLastSetData('main')}
          onUpdateSet={updateMainSet}
          onNext={handleNext}
          nextExerciseName={nextExercise}
        />
      </div>
    );
  }

  if (currentStep === 'supplemental') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
        <div className="bg-white dark:bg-gray-800">
          <WorkoutHeader
            liftName={liftNames[liftType]}
            week={profile.current_week}
            cycle={profile.current_cycle}
            onBack={onBack}
          />

          <div className="max-w-md mx-auto px-4 pb-4">
            <AccessibleProgressIndicator
              current={2}
              total={totalSteps}
              label="Workout progress"
              variant="bar"
            />
          </div>
        </div>

        <SupplementalLiftView
          liftName={liftNames[liftType]}
          variationType={programVariation as 'bbb' | 'bbs'}
          supplementalSets={supplementalSets}
          unitPreference={profile.unit_preference || 'lb'}
          onUpdateSet={updateSupplementalSet}
          onNext={handleNext}
          nextExerciseName={nextExercise}
        />
      </div>
    );
  }

  const currentExercise = getCurrentExercise();
  if (!currentExercise) return null;

  const exerciseIndex = currentStep as number;
  const exerciseSets = accessoryData[exerciseIndex] || Array(currentExercise.sets).fill(null).map(() => ({ reps: '', weight: '' }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      <div className="bg-white dark:bg-gray-800">
        <WorkoutHeader
          liftName={liftNames[liftType]}
          week={profile.current_week}
          cycle={profile.current_cycle}
          onBack={onBack}
        />

        <div className="max-w-md mx-auto px-4 pb-4">
          <AccessibleProgressIndicator
            current={exerciseIndex + (hasSupplemental ? 3 : 2)}
            total={totalSteps}
            label="Workout progress"
            variant="bar"
          />
        </div>
      </div>

      <AccessoryExerciseView
        exercise={currentExercise}
        exerciseSets={exerciseSets}
        unitPreference={profile.unit_preference || 'lb'}
        lastSetData={getLastSetData(currentExercise.name)}
        substitutedFrom={exerciseSubstitutions[exerciseIndex] ? baseExercises[liftType as keyof typeof baseExercises][exerciseIndex].name : undefined}
        onUpdateSet={(index, field, value) => updateAccessorySet(exerciseIndex, index, field, value)}
        onAddSet={() => addAccessorySet(exerciseIndex)}
        onRemoveSet={(index) => removeAccessorySet(exerciseIndex, index)}
        onSubstitute={() => handleOpenSubstitution(exerciseIndex)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        nextExerciseName={nextExercise}
        saving={saving}
      />

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
