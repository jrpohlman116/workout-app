import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateOneRepMax, buildWaveSchedule, WeekBlock, calculateJuggernautSets, calculatePeakingSets, JuggernautSetsConfig } from '../../lib/calculations';
import { supabase } from '../../lib/supabase';
import { useConfetti } from '../../hooks/useAnimations';
import { useWorkoutTemplate } from '../../hooks/useWorkoutTemplate';
import WorkoutSuccessModal from '../../components/features/WorkoutSuccessModal';
import ExerciseSubstitutionModal from '../../components/features/ExerciseSubstitutionModal';
import AccessibleProgressIndicator from '../../components/accessible/AccessibleProgressIndicator';
import WorkoutHeader from './WorkoutHeader';
import WorkoutSummaryView from './WorkoutSummaryView';
import MainLiftView from './MainLiftView';
import AccessoryExerciseView from './AccessoryExerciseView';
import { useWorkoutData } from './useWorkoutData';
import { liftNames, liftNamesShort, baseExercises, additionalExercises } from './constants';
import { WorkoutDetailPageProps, WorkoutStep, SetInput } from './types';

function getCurrentWeekBlock(programStartDate: string | undefined, meetDate: string | undefined): WeekBlock | null {
  if (!meetDate) return null;
  const meet = new Date(meetDate);
  const start = programStartDate
    ? new Date(programStartDate)
    : new Date(meet.getTime() - 16 * 7 * 24 * 60 * 60 * 1000);
  const schedule = buildWaveSchedule(start, meet);
  const now = Date.now();
  return schedule.weeks.find(w => w.startDate.getTime() <= now && w.endDate.getTime() >= now) ?? null;
}

const IS_UPPER_DAY = (liftType: string) => liftType === 'upper';

export default function WorkoutDetailPage({ liftType, onBack, onNavigateToProgress, skipSummary }: WorkoutDetailPageProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WorkoutStep>(
    skipSummary ? (liftType === 'upper' ? 0 : 'main') : 'summary'
  );

  useLayoutEffect(() => {
    if (skipSummary && currentStep === 'summary') {
      setCurrentStep(liftType === 'upper' ? 0 : 'main');
    }
  }, []);

  const [saving, setSaving] = useState(false);
  const celebrate = useConfetti();

  const [mainSets, setMainSets] = useState<SetInput[]>([
    { reps: '', weight: '' },
    { reps: '', weight: '' },
    { reps: '', weight: '' },
  ]);
  const [initialMainSetsSet, setInitialMainSetsSet] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);

  const [accessoryData, setAccessoryData] = useState<{ [key: number]: SetInput[] }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({ estimated1RM: 0, totalTonnage: 0 });
  const savedSessionIdRef = useRef<string | null>(null);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ exerciseIndex: number; exerciseName: string } | null>(null);
  const [workoutSaveError, setWorkoutSaveError] = useState<string | null>(null);
  const [draftOffer, setDraftOffer] = useState<{
    mainSets: SetInput[];
    accessoryData: { [key: number]: SetInput[] };
    savedAt: string;
  } | null>(null);

  const { lastAccessoryData, loading, getLastSetData } = useWorkoutData(user?.id, liftType);

  const isUpperDay = IS_UPPER_DAY(liftType);
  const currentBlock = getCurrentWeekBlock(profile?.program_start_date, profile?.meet_date);

  const defaultExercises = baseExercises[liftType as keyof typeof baseExercises] ?? baseExercises.upper;

  const liftTypeKey = liftType as 'squat' | 'bench' | 'deadlift' | 'ohp' | 'upper';
  const userWeakPoints = (liftTypeKey in (profile?.weak_points || {}))
    ? (profile?.weak_points?.[liftTypeKey as keyof typeof profile.weak_points] as string[] | undefined)
    : undefined;

  const {
    exercises: templateExercises,
    loading: templateLoading,
    saving: templateSaving,
    error: templateError,
    saveTemplate,
    resetToDefault,
  } = useWorkoutTemplate(
    user?.id,
    liftTypeKey,
    'standard',
    defaultExercises,
    userWeakPoints as any
  );

  useEffect(() => {
    if (!loading && profile && !initialMainSetsSet && !isUpperDay && currentBlock) {
      const lift1RM: Record<string, number> = {
        squat: profile.squat_max,
        bench: profile.bench_max,
        deadlift: profile.deadlift_max,
      };
      const max = lift1RM[liftType] ?? 0;
      const unit = profile.unit_preference || 'lb';
      const cfg = currentBlock.phase === 'peaking'
        ? calculatePeakingSets(currentBlock.peakWeek ?? 1, max, unit)
        : calculateJuggernautSets(currentBlock.wave, currentBlock.phase, max, unit);

      setMainSets(
        Array.from({ length: cfg.numSets }, () => ({
          reps: cfg.isAmap ? '' : String(cfg.reps),
          weight: String(cfg.weight),
        }))
      );
      setInitialMainSetsSet(true);
    }
  }, [loading, profile, initialMainSetsSet, liftType, isUpperDay]);

  useEffect(() => {
    if (!loading && Object.keys(lastAccessoryData).length > 0 && profile) {
      const currentExercises = templateExercises;
      const initialAccessoryData: { [key: number]: SetInput[] } = {};
      currentExercises.forEach((exercise, index) => {
        const lastData = lastAccessoryData[exercise.name];
        if (lastData && lastData.length > 0) {
          initialAccessoryData[index] = lastData.map(set => ({
            reps: set.reps || '',
            weight: set.weight || '',
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
  }, [loading, lastAccessoryData, liftType, profile, templateExercises]);

  useEffect(() => {
    if (!user || !profile) return;
    const key = `jt_draft_${user.id}_${liftType}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.cycle !== profile.current_cycle || parsed.week !== profile.current_week) {
        localStorage.removeItem(key);
        return;
      }
      const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
      if (ageMs > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return;
      }
      setDraftOffer({ mainSets: parsed.mainSets, accessoryData: parsed.accessoryData, savedAt: parsed.savedAt });
    } catch {
      try { localStorage.removeItem(key); } catch {}
    }
  }, [user?.id, liftType, profile?.current_cycle, profile?.current_week]);

  const handleRestoreDraft = () => {
    if (!draftOffer || !user) return;
    setMainSets(draftOffer.mainSets);
    setAccessoryData(draftOffer.accessoryData);
    try { localStorage.removeItem(`jt_draft_${user.id}_${liftType}`); } catch {}
    setDraftOffer(null);
  };

  const handleDismissDraft = () => {
    if (!user) return;
    try { localStorage.removeItem(`jt_draft_${user.id}_${liftType}`); } catch {}
    setDraftOffer(null);
  };

  if (!profile) return null;

  if (!currentBlock) {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <div className="max-w-md mx-auto px-4 pt-8 pb-6">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-1">Juggernaut</p>
            <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100">{liftNames[liftType] ?? liftType}</h1>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">Program not set up</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Add your program start date and meet date in Profile to get your Juggernaut schedule.
            </p>
            <button onClick={onBack} className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              ← Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentBlock?.phase === 'meet_week') {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <div className="max-w-md mx-auto px-4 pt-8 pb-6">
            <button onClick={onBack} className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4 block">← Back</button>
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-1">Meet Week</p>
            <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100">{liftNames[liftType] ?? liftType}</h1>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-2">Rest Up</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              This is meet week. Keep any movement light and technical — no heavy loading. Save everything for the platform.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              When it's meet day, head back to the Home screen to log your attempts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const maxes: Record<string, number> = {
    squat: profile.squat_max,
    bench: profile.bench_max,
    deadlift: profile.deadlift_max,
  };

  const unit = profile.unit_preference || 'lb';

  const mainConfig: JuggernautSetsConfig | null = isUpperDay ? null : (() => {
    const trainingMax = maxes[liftType] ?? 0;
    if (currentBlock) {
      if (currentBlock.phase === 'peaking') {
        return calculatePeakingSets(currentBlock.peakWeek ?? 1, trainingMax, unit);
      }
      if (currentBlock.phase === 'meet_week') return null;
      return calculateJuggernautSets(currentBlock.wave, currentBlock.phase, trainingMax, unit);
    }
    return null;
  })();

  const mainReps = currentBlock
    ? (currentBlock.phase === 'peaking' ? 1 : currentBlock.wave)
    : (profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5);

  const currentExercises = templateExercises;
  const totalSteps = (isUpperDay ? 0 : 1) + currentExercises.length;

  const getProgressPercentage = () => {
    if (currentStep === 'summary') return 0;
    if (currentStep === 'main') return (1 / totalSteps) * 100;
    const offset = isUpperDay ? 1 : 2;
    return (((currentStep as number) + offset) / totalSteps) * 100;
  };

  const getCurrentExercise = () => {
    if (typeof currentStep === 'number') {
      return currentExercises[currentStep];
    }
    return null;
  };

  const getNextExerciseName = () => {
    if (currentStep === 'summary') return isUpperDay ? currentExercises[0]?.name : liftNamesShort[liftType];
    if (currentStep === 'main') return currentExercises[0]?.name ?? null;
    const nextIndex = (currentStep as number) + 1;
    return nextIndex < currentExercises.length ? currentExercises[nextIndex].name : null;
  };

  const handleNext = () => {
    if (currentStep === 'summary') {
      setCurrentStep(isUpperDay ? 0 : 'main');
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
      setCurrentStep(isUpperDay ? 'summary' : 'main');
    } else if (typeof currentStep === 'number') {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateMainSet = (index: number, field: 'reps' | 'weight', value: string) => {
    const newSets = [...mainSets];
    newSets[index][field] = value;
    setMainSets(newSets);
  };

  const handleWorkingWeightAdjust = (weight: number) => {
    setMainSets(prev => prev.map(set => ({ ...set, weight: String(weight) })));
  };

  const updateAccessorySet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const exerciseSets = accessoryData[exerciseIndex] || Array(3).fill(null).map(() => ({ reps: '', weight: '' }));
    const newSets = [...exerciseSets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    setAccessoryData({ ...accessoryData, [exerciseIndex]: newSets });
  };

  const addAccessorySet = (exerciseIndex: number) => {
    const exerciseSets = accessoryData[exerciseIndex] || Array(3).fill(null).map(() => ({ reps: '', weight: '' }));
    setAccessoryData({ ...accessoryData, [exerciseIndex]: [...exerciseSets, { reps: '', weight: '' }] });
  };

  const removeAccessorySet = (exerciseIndex: number, setIndex: number) => {
    const exerciseSets = accessoryData[exerciseIndex] || Array(3).fill(null).map(() => ({ reps: '', weight: '' }));
    if (exerciseSets.length <= 1) return;
    setAccessoryData({ ...accessoryData, [exerciseIndex]: exerciseSets.filter((_, idx) => idx !== setIndex) });
  };

  const calculateTotalTonnage = () => {
    let tonnage = 0;
    mainSets.forEach(set => { tonnage += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0); });
    Object.values(accessoryData).forEach(sets => {
      sets.forEach(set => { tonnage += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0); });
    });
    return tonnage;
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    setWorkoutSaveError(null);

    const draftKey = `jt_draft_${user.id}_${liftType}`;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        liftType, mainSets, accessoryData,
        cycle: profile.current_cycle,
        week: profile.current_week,
        savedAt: new Date().toISOString(),
      }));
    } catch { /* storage unavailable — proceed anyway */ }

    try {
      let sessionId = savedSessionIdRef.current;

      if (!sessionId) {
        const topSet = mainSets[mainSets.length - 1];
        const topWeight = parseFloat(topSet.weight);
        const topReps = parseInt(topSet.reps);
        const totalTonnage = calculateTotalTonnage();
        const calculated1RM = topWeight && topReps ? calculateOneRepMax(topWeight, topReps) : 0;

        const sessionPayload: Record<string, unknown> = {
          user_id: user.id,
          lift_type: liftType,
          cycle: profile.current_cycle,
          week: profile.current_week,
          weight_lifted: topWeight || 0,
          reps_performed: topReps || 0,
          calculated_1rm: calculated1RM,
        };

        if (currentBlock) {
          sessionPayload.wave = currentBlock.wave;
          sessionPayload.phase = currentBlock.phase;
        }
        if (rpe !== null) {
          sessionPayload.rpe = rpe;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert(sessionPayload)
          .select()
          .single();

        if (sessionError) throw sessionError;

        sessionId = sessionData.id;
        savedSessionIdRef.current = sessionId;
        setWorkoutStats({ estimated1RM: calculated1RM, totalTonnage });
      }

      const accessoryInserts = Object.entries(accessoryData)
        .filter(([_, sets]) => sets.some(set => set.reps || set.weight))
        .map(([exerciseIndex, sets]) => ({
          workout_session_id: sessionId,
          exercise_name: currentExercises[parseInt(exerciseIndex)].name,
          exercise_order: parseInt(exerciseIndex),
          sets_data: sets,
        }));

      if (accessoryInserts.length > 0) {
        // Delete before insert: idempotent on retry, no-op on first call.
        await supabase.from('accessory_exercises').delete().eq('workout_session_id', sessionId);
        const { error: accessoryError } = await supabase
          .from('accessory_exercises')
          .insert(accessoryInserts);
        if (accessoryError) throw accessoryError;
      }

      try { localStorage.removeItem(draftKey); } catch {}
      celebrate(40);
      setShowSuccessModal(true);
    } catch {
      setWorkoutSaveError(
        savedSessionIdRef.current
          ? 'Session logged, but accessories failed to save. Tap "Try again" to retry.'
          : 'Workout not saved. Your sets are still here — tap "Try again" when ready.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessClose = async () => {
    setShowSuccessModal(false);
    await refreshProfile();
    onNavigateToProgress();
  };

  const handleSetAsMax = async () => {
    if (!user || !profile) return;
    const fieldMap: Record<string, string> = {
      squat: 'squat_max',
      bench: 'bench_max',
      deadlift: 'deadlift_max',
    };
    const field = fieldMap[liftType];
    if (!field) return;
    await supabase
      .from('user_profiles')
      .update({ [field]: Math.round(workoutStats.estimated1RM), updated_at: new Date().toISOString() })
      .eq('id', user.id);
    await refreshProfile();
  };

  const handleOpenSubstitution = (exerciseIndex: number) => {
    const currentExercise = currentExercises[exerciseIndex];
    setSubstitutionTarget({ exerciseIndex, exerciseName: currentExercise.name });
    setShowSubstitutionModal(true);
  };

  const allAvailableExercises = [
    ...baseExercises.squat,
    ...baseExercises.bench,
    ...baseExercises.deadlift,
    ...baseExercises.upper,
    ...additionalExercises,
  ].filter((ex, index, self) => index === self.findIndex(e => e.name === ex.name));

  const headerProps = {
    liftName: liftNames[liftType] ?? liftType,
    wave: currentBlock?.wave,
    phase: currentBlock?.phase,
    peakWeek: currentBlock?.peakWeek,
    week: currentBlock ? undefined : profile.current_week,
    cycle: currentBlock ? undefined : profile.current_cycle,
    onBack,
  };

  if (currentStep === 'summary') {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <WorkoutHeader {...headerProps} />
        </div>
        <div className="animate-enter">
        {draftOffer && (
          <div className="max-w-md mx-auto px-4 pt-4">
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">Unsaved session found</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Your last workout was interrupted. Restore your sets to try again.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDismissDraft}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Start Fresh
                </button>
                <button
                  onClick={handleRestoreDraft}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Restore Sets
                </button>
              </div>
            </div>
          </div>
        )}
        <WorkoutSummaryView
          mainConfig={mainConfig}
          exercises={currentExercises}
          onStartWorkout={handleNext}
          unitPreference={profile.unit_preference || 'lb'}
          wave={currentBlock?.wave}
          phase={currentBlock?.phase}
          onSaveExercises={saveTemplate}
          onResetExercises={() => resetToDefault(defaultExercises)}
          availableExercises={allAvailableExercises}
          isSaving={templateSaving}
          saveError={templateError}
        />
        </div>
      </div>
    );
  }

  const nextExercise = getNextExerciseName();
  const progressCurrent = currentStep === 'main'
    ? 1
    : (currentStep as number) + (isUpperDay ? 1 : 2);

  if (currentStep === 'main') {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <WorkoutHeader {...headerProps} />
          <div className="max-w-md mx-auto px-4 pb-4">
            <AccessibleProgressIndicator current={1} total={totalSteps} label="Workout progress" variant="bar" />
          </div>
        </div>
        {draftOffer && (
          <div className="max-w-md mx-auto px-4 pt-4">
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-0">
              <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 mb-1">Unsaved session found</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Your last workout was interrupted. Restore your sets to try again.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDismissDraft}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Start Fresh
                </button>
                <button
                  onClick={handleRestoreDraft}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                >
                  Restore Sets
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="animate-slide-right">
          <MainLiftView
            liftName={liftNames[liftType] ?? liftType}
            mainSets={mainSets}
            mainReps={mainReps}
            unitPreference={profile.unit_preference || 'lb'}
            lastSetData={getLastSetData('main')}
            phase={currentBlock?.phase}
            baseWeight={mainConfig?.weight}
            onUpdateSet={updateMainSet}
            onRpeChange={setRpe}
            onWorkingWeightAdjust={handleWorkingWeightAdjust}
            onNext={handleNext}
            nextExerciseName={nextExercise}
          />
        </div>
      </div>
    );
  }

  const currentExercise = getCurrentExercise();
  if (!currentExercise) return null;

  const exerciseIndex = currentStep as number;
  const exerciseSets = accessoryData[exerciseIndex] || Array(currentExercise.sets).fill(null).map(() => ({ reps: '', weight: '' }));

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <WorkoutHeader {...headerProps} />
        <div className="max-w-md mx-auto px-4 pb-4">
          <AccessibleProgressIndicator current={progressCurrent} total={totalSteps} label="Workout progress" variant="bar" />
        </div>
      </div>

      {workoutSaveError && (
        <div className="max-w-md mx-auto px-4 pt-4" role="alert">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3">{workoutSaveError}</p>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="text-sm font-semibold text-red-700 dark:text-red-300 underline underline-offset-2 disabled:opacity-50"
            >
              {saving ? 'Retrying...' : 'Try again'}
            </button>
          </div>
        </div>
      )}

      <div className="animate-slide-right">
        <AccessoryExerciseView
          exercise={currentExercise}
          exerciseSets={exerciseSets}
          unitPreference={profile.unit_preference || 'lb'}
          lastSetData={getLastSetData(currentExercise.name)}
          onUpdateSet={(index, field, value) => updateAccessorySet(exerciseIndex, index, field, value)}
          onAddSet={() => addAccessorySet(exerciseIndex)}
          onRemoveSet={(index) => removeAccessorySet(exerciseIndex, index)}
          onSubstitute={() => handleOpenSubstitution(exerciseIndex)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          nextExerciseName={nextExercise}
          saving={saving}
        />
      </div>

      {showSuccessModal && (
        <WorkoutSuccessModal
          liftName={liftNames[liftType] ?? liftType}
          estimated1RM={workoutStats.estimated1RM}
          totalTonnage={workoutStats.totalTonnage}
          unitPreference={profile?.unit_preference || 'lb'}
          onClose={handleSuccessClose}
          onSetAsMax={!isUpperDay ? handleSetAsMax : undefined}
        />
      )}
      {showSubstitutionModal && substitutionTarget && (
        <ExerciseSubstitutionModal
          isOpen={showSubstitutionModal}
          onClose={() => setShowSubstitutionModal(false)}
          currentExercise={substitutionTarget.exerciseName}
          onSubstitute={() => console.log('Substitution handled in template system')}
          availableExercises={allAvailableExercises}
        />
      )}
    </div>
  );
}
