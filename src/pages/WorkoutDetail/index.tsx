import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateOneRepMax, calculateNewTrainingMax, buildWaveSchedule, WeekBlock, calculateJuggernautSets, calculatePeakingSets, getPeakingWeekNote, JuggernautSetsConfig, getRoundingIncrement } from '../../lib/calculations';
import { DEFAULT_PROGRAM_WEEKS, WEIGHT_DISPLAY_RANGE_LOW, WEIGHT_DISPLAY_RANGE_HIGH, REST_TIMER_DEFAULTS, RestTimerKind } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useConfetti } from '../../hooks/useAnimations';
import { useWorkoutTemplate } from '../../hooks/useWorkoutTemplate';
import WorkoutSuccessModal from '../../components/features/WorkoutSuccessModal';
import ExerciseSubstitutionModal from '../../components/features/ExerciseSubstitutionModal';
import AccessibleProgressIndicator from '../../components/accessible/AccessibleProgressIndicator';
import RestTimer from '../../components/features/RestTimer';
import WorkoutHeader from './views/WorkoutHeader';
import WorkoutSummaryView from './views/WorkoutSummaryView';
import MainLiftView from './views/MainLiftView';
import AccessoryExerciseView from './views/AccessoryExerciseView';
import { useWorkoutData } from '../../hooks/useWorkoutData';
import { liftNames, liftNamesShort, baseExercises, additionalExercises, ACCESSORY_PCT_OF_TM, ACCESSORY_WEAK_POINT_SOURCE, applyPhaseToAccessories } from '../../lib/exercises';
import { WorkoutDetailPageProps, WorkoutStep, SetInput } from '../../lib/types';
import type { StickingPoint } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import SectionLabel from '../../components/ui/SectionLabel';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';

function getCurrentWeekBlock(
  programStartDate: string | undefined,
  meetDate: string | undefined,
  currentWeekIndex: number | undefined
): WeekBlock | null {
  if (!meetDate) return null;
  const meet = new Date(meetDate);
  const start = programStartDate
    ? new Date(programStartDate)
    : new Date(meet.getTime() - DEFAULT_PROGRAM_WEEKS * 7 * 24 * 60 * 60 * 1000);
  const schedule = buildWaveSchedule(start, meet);
  if (schedule.weeks.length === 0) return null;

  // current_week_index is the source of truth once set — it advances only
  // when the user finishes/skips a week, not on its own with the calendar.
  if (currentWeekIndex != null) {
    const clamped = Math.max(0, Math.min(schedule.weeks.length - 1, currentWeekIndex));
    return schedule.weeks[clamped];
  }

  const now = Date.now();
  const current = schedule.weeks.find(w => w.startDate.getTime() <= now && w.endDate.getTime() >= now);
  if (current) return current;
  // Pre-program gap (startOffset > 0): use the first upcoming week
  if (schedule.weeks[0].startDate.getTime() > now) {
    return schedule.weeks[0];
  }
  return null;
}

const IS_UPPER_DAY = (liftType: string) => liftType === 'upper';

// Per-set done states — purely informational (completing a workout never
// requires them). Also the trigger surface for the upcoming rest timer.
interface SetChecks {
  warmup: boolean[];
  main: boolean[];
  accessories: Record<number, boolean[]>;
}

const EMPTY_CHECKS: SetChecks = { warmup: [], main: [], accessories: {} };

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
  const [setChecks, setSetChecks] = useState<SetChecks>(EMPTY_CHECKS);
  const [restTimer, setRestTimer] = useState<{ endsAt: number; totalSeconds: number } | null>(null);
  // Autosave only after the user actually does something — otherwise the
  // initial prefill would clobber a restorable draft on mount.
  const dirtyRef = useRef(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [workoutStats, setWorkoutStats] = useState({ estimated1RM: 0, totalTonnage: 0, topReps: 0 });
  const savedSessionIdRef = useRef<string | null>(null);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ exerciseIndex: number; exerciseName: string } | null>(null);
  const [workoutSaveError, setWorkoutSaveError] = useState<string | null>(null);
  const [draftOffer, setDraftOffer] = useState<{
    mainSets: SetInput[];
    accessoryData: { [key: number]: SetInput[] };
    setChecks?: SetChecks;
    savedAt: string;
  } | null>(null);

  const { lastAccessoryData, loading, getLastSetData } = useWorkoutData(user?.id, liftType);

  const isUpperDay = IS_UPPER_DAY(liftType);
  const currentBlock = getCurrentWeekBlock(profile?.program_start_date, profile?.meet_date, profile?.current_week_index);

  const defaultExercises = baseExercises[liftType as keyof typeof baseExercises] ?? baseExercises.upper;

  const liftTypeKey = liftType as 'squat' | 'bench' | 'deadlift' | 'ohp' | 'upper';
  // Cross-day targeting: each day trains the opposite lift's weak points
  // (squat day → deadlift, deadlift day → squat, upper day → bench, bench
  // day → general support only). See ACCESSORY_WEAK_POINT_SOURCE.
  const weakPointSource = ACCESSORY_WEAK_POINT_SOURCE[liftTypeKey] ?? null;
  const userWeakPoints = weakPointSource
    ? (profile?.weak_points?.[weakPointSource.profileLift] as StickingPoint[] | undefined)
    : undefined;

  const {
    exercises: templateExercises,
    saving: templateSaving,
    error: templateError,
    saveTemplate,
    resetToDefault,
  } = useWorkoutTemplate(
    user?.id,
    liftTypeKey,
    'standard',
    defaultExercises,
    userWeakPoints
  );

  // Phase-adjusted view of the template: identity comes from the saved
  // template, set counts and peaking filters from the phase plan. Render-time
  // only — the raw template is what Edit mode sees and saves.
  const { exercises: currentExercises, note: phaseNote } = useMemo(
    () => applyPhaseToAccessories(templateExercises, currentBlock?.phase, liftType),
    [templateExercises, currentBlock?.phase, liftType]
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
        ? calculatePeakingSets(currentBlock.peakWeek ?? 1, currentBlock.totalPeakWeeks ?? 3, max, unit, liftType)
        : calculateJuggernautSets(currentBlock.wave, currentBlock.phase, max, unit);

      const sets: SetInput[] = Array.from({ length: cfg.numSets }, () => ({
        reps: cfg.isAmap ? '' : String(cfg.reps),
        weight: String(cfg.weight),
      }));
      if (cfg.downSets) {
        for (let i = 0; i < cfg.downSets.sets; i++) {
          sets.push({ reps: String(cfg.downSets.reps), weight: String(cfg.downSets.weight) });
        }
      }
      setMainSets(sets);
      setInitialMainSetsSet(true);
    }
  }, [loading, profile, initialMainSetsSet, liftType, isUpperDay]);

  useEffect(() => {
    if (!loading && Object.keys(lastAccessoryData).length > 0 && profile) {
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
  }, [loading, lastAccessoryData, liftType, profile, currentExercises]);

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
      setDraftOffer({ mainSets: parsed.mainSets, accessoryData: parsed.accessoryData, setChecks: parsed.setChecks, savedAt: parsed.savedAt });
    } catch {
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    }
  }, [user?.id, liftType, profile?.current_cycle, profile?.current_week]);

  // Continuous draft autosave (debounced): inputs and check-offs survive an
  // accidental refresh or navigation. Only runs after first user interaction
  // (dirtyRef) and is cleared on successful workout save.
  useEffect(() => {
    if (!user || !profile || !dirtyRef.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`jt_draft_${user.id}_${liftType}`, JSON.stringify({
          liftType, mainSets, accessoryData, setChecks,
          cycle: profile.current_cycle,
          week: profile.current_week,
          savedAt: new Date().toISOString(),
        }));
      } catch { /* storage unavailable */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [mainSets, accessoryData, setChecks, user, profile, liftType]);

  // Checking a set off (not un-checking) starts the rest countdown for
  // that set type. Restarting on every check keeps the newest rest active.
  const startRestTimer = (kind: RestTimerKind) => {
    const seconds = REST_TIMER_DEFAULTS[kind];
    setRestTimer({ endsAt: Date.now() + seconds * 1000, totalSeconds: seconds });
  };

  const toggleWarmupCheck = (index: number) => {
    dirtyRef.current = true;
    if (!setChecks.warmup[index]) startRestTimer('warmup');
    setSetChecks(prev => {
      const warmup = [...prev.warmup];
      warmup[index] = !warmup[index];
      return { ...prev, warmup };
    });
  };

  const toggleMainCheck = (index: number) => {
    dirtyRef.current = true;
    if (!setChecks.main[index]) startRestTimer('main');
    setSetChecks(prev => {
      const main = [...prev.main];
      main[index] = !main[index];
      return { ...prev, main };
    });
  };

  const toggleAccessoryCheck = (exerciseIndex: number, setIndex: number) => {
    dirtyRef.current = true;
    if (!setChecks.accessories[exerciseIndex]?.[setIndex]) startRestTimer('accessory');
    setSetChecks(prev => {
      const sets = [...(prev.accessories[exerciseIndex] || [])];
      sets[setIndex] = !sets[setIndex];
      return { ...prev, accessories: { ...prev.accessories, [exerciseIndex]: sets } };
    });
  };

  const restTimerElement = restTimer && (
    <RestTimer
      endsAt={restTimer.endsAt}
      totalSeconds={restTimer.totalSeconds}
      onExtend={(seconds) => setRestTimer(prev => prev && ({ ...prev, endsAt: prev.endsAt + seconds * 1000 }))}
      onDismiss={() => setRestTimer(null)}
    />
  );

  const handleRestoreDraft = () => {
    if (!draftOffer || !user) return;
    setMainSets(draftOffer.mainSets);
    setAccessoryData(draftOffer.accessoryData);
    setSetChecks(draftOffer.setChecks ?? EMPTY_CHECKS);
    dirtyRef.current = true;
    try { localStorage.removeItem(`jt_draft_${user.id}_${liftType}`); } catch { /* storage unavailable */ }
    setDraftOffer(null);
  };

  const handleDismissDraft = () => {
    if (!user) return;
    try { localStorage.removeItem(`jt_draft_${user.id}_${liftType}`); } catch { /* storage unavailable */ }
    setDraftOffer(null);
  };

  if (!profile) return null;

  if (!currentBlock) {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <PageHeader eyebrow="Juggernaut" title={liftNames[liftType] ?? liftType} />
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          <Card className="p-6">
            <SectionLabel className="mb-1">Program not set up</SectionLabel>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Add your program start date and meet date in Profile to get your Juggernaut schedule.
            </p>
            <Button variant="ghost" size="sm" onClick={onBack}>← Go back</Button>
          </Card>
        </div>
      </div>
    );
  }

  if (currentBlock?.phase === 'meet_week') {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <div className="max-w-md mx-auto px-4 pt-8 pb-6">
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">← Back</Button>
            <SectionLabel tone="page" className="mb-1">Meet Week</SectionLabel>
            <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100">{liftNames[liftType] ?? liftType}</h1>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          <Card className="p-6">
            <SectionLabel className="mb-2">Rest Up</SectionLabel>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              This is meet week. Keep any movement light and technical — no heavy loading. Save everything for the platform.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              When it's meet day, head back to the Home screen to log your attempts.
            </p>
          </Card>
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

  // Suggested weight range for accessories that are barbell variations of a
  // main lift (pause squats, board press, rack pulls, etc.) — the rest of
  // the accessory pool has no %TM basis and gets no suggestion.
  const getAccessorySuggestion = (exerciseName: string): { low: number; high: number } | null => {
    const mapping = ACCESSORY_PCT_OF_TM[exerciseName];
    if (!mapping) return null;
    const trainingMax = maxes[mapping.baseLift] ?? 0;
    if (trainingMax <= 0) return null;
    const roundTo = getRoundingIncrement(unit);
    const base = trainingMax * mapping.pct;
    return {
      low: Math.round((base * WEIGHT_DISPLAY_RANGE_LOW) / roundTo) * roundTo,
      high: Math.round((base * WEIGHT_DISPLAY_RANGE_HIGH) / roundTo) * roundTo,
    };
  };

  const mainConfig: JuggernautSetsConfig | null = isUpperDay ? null : (() => {
    const trainingMax = maxes[liftType] ?? 0;
    if (currentBlock) {
      if (currentBlock.phase === 'peaking') {
        return calculatePeakingSets(currentBlock.peakWeek ?? 1, currentBlock.totalPeakWeeks ?? 3, trainingMax, unit, liftType);
      }
      return calculateJuggernautSets(currentBlock.wave, currentBlock.phase, trainingMax, unit);
    }
    return null;
  })();

  const mainReps = currentBlock
    ? (currentBlock.phase === 'peaking' ? 1 : currentBlock.wave)
    : (profile.current_week === 1 ? 5 : profile.current_week === 2 ? 3 : profile.current_week === 3 ? '5-3-1' : 5);

  // Only realization-week AMAP sets have a meaningful "standard vs actual reps"
  // comparison to progress the training max from.
  const newTrainingMax = mainConfig?.isAmap && currentBlock
    ? calculateNewTrainingMax(maxes[liftType] ?? 0, currentBlock.wave, workoutStats.topReps, unit, liftType)
    : undefined;

  const totalSteps = (isUpperDay ? 0 : 1) + currentExercises.length;

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
    dirtyRef.current = true;
    const newSets = [...mainSets];
    newSets[index][field] = value;
    setMainSets(newSets);
  };

  const handleWorkingWeightAdjust = (weight: number) => {
    dirtyRef.current = true;
    // In peaking weeks with down sets, only the top single takes the warm-up
    // adjustment — down-set weights are prescribed independently of feel.
    if (mainConfig?.downSets) {
      setMainSets(prev => prev.map((set, i) => (i === 0 ? { ...set, weight: String(weight) } : set)));
    } else {
      setMainSets(prev => prev.map(set => ({ ...set, weight: String(weight) })));
    }
  };

  const emptyAccessorySets = (exerciseIndex: number) =>
    Array(currentExercises[exerciseIndex]?.sets ?? 3).fill(null).map(() => ({ reps: '', weight: '' }));

  const updateAccessorySet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    dirtyRef.current = true;
    const exerciseSets = accessoryData[exerciseIndex] || emptyAccessorySets(exerciseIndex);
    const newSets = [...exerciseSets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    setAccessoryData({ ...accessoryData, [exerciseIndex]: newSets });
  };

  const addAccessorySet = (exerciseIndex: number) => {
    dirtyRef.current = true;
    const exerciseSets = accessoryData[exerciseIndex] || emptyAccessorySets(exerciseIndex);
    setAccessoryData({ ...accessoryData, [exerciseIndex]: [...exerciseSets, { reps: '', weight: '' }] });
  };

  const removeAccessorySet = (exerciseIndex: number, setIndex: number) => {
    dirtyRef.current = true;
    const exerciseSets = accessoryData[exerciseIndex] || emptyAccessorySets(exerciseIndex);
    if (exerciseSets.length <= 1) return;
    setAccessoryData({ ...accessoryData, [exerciseIndex]: exerciseSets.filter((_, idx) => idx !== setIndex) });
    // Keep check indices aligned with the surviving sets
    setSetChecks(prev => {
      const checks = prev.accessories[exerciseIndex];
      if (!checks) return prev;
      return {
        ...prev,
        accessories: { ...prev.accessories, [exerciseIndex]: checks.filter((_, idx) => idx !== setIndex) },
      };
    });
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
        liftType, mainSets, accessoryData, setChecks,
        cycle: profile.current_cycle,
        week: profile.current_week,
        savedAt: new Date().toISOString(),
      }));
    } catch { /* storage unavailable — proceed anyway */ }

    try {
      let sessionId = savedSessionIdRef.current;

      if (!sessionId) {
        // Heaviest set, not last — peaking weeks put the top single first
        // with lighter down sets after it. Ties keep the last occurrence,
        // matching the old last-element behavior in uniform phases.
        const topSet = mainSets.reduce(
          (best, set) => ((parseFloat(set.weight) || 0) >= (parseFloat(best.weight) || 0) ? set : best),
          mainSets[0]
        );
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
        setWorkoutStats({ estimated1RM: calculated1RM, totalTonnage, topReps: topReps || 0 });
      }

      const accessoryInserts = Object.entries(accessoryData)
        .filter(([, sets]) => sets.some(set => set.reps || set.weight))
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

      try { localStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
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
    if (!user || !profile || newTrainingMax == null) return;
    const fieldMap: Record<string, string> = {
      squat: 'squat_max',
      bench: 'bench_max',
      deadlift: 'deadlift_max',
    };
    const field = fieldMap[liftType];
    if (!field) return;
    const newMax = newTrainingMax;
    await supabase
      .from('user_profiles')
      .update({ [field]: newMax, updated_at: new Date().toISOString() })
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
    totalPeakWeeks: currentBlock?.totalPeakWeeks,
    peakingNote: currentBlock?.phase === 'peaking'
      ? getPeakingWeekNote(currentBlock.peakWeek ?? 1, currentBlock.totalPeakWeeks ?? 3, liftType)
      : undefined,
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
              <SectionLabel className="mb-1">Unsaved session found</SectionLabel>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Your last workout was interrupted. Restore your sets to try again.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={handleDismissDraft}>
                  Start Fresh
                </Button>
                <Button size="sm" className="flex-1" onClick={handleRestoreDraft}>
                  Restore Sets
                </Button>
              </div>
            </div>
          </div>
        )}
        <WorkoutSummaryView
          mainConfig={mainConfig}
          exercises={currentExercises}
          editExercises={templateExercises}
          phaseNote={phaseNote}
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
              <SectionLabel className="mb-1">Unsaved session found</SectionLabel>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Your last workout was interrupted. Restore your sets to try again.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={handleDismissDraft}>
                  Start Fresh
                </Button>
                <Button size="sm" className="flex-1" onClick={handleRestoreDraft}>
                  Restore Sets
                </Button>
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
            warmupChecks={setChecks.warmup}
            onToggleWarmupCheck={toggleWarmupCheck}
            setChecks={setChecks.main}
            onToggleSetCheck={toggleMainCheck}
            onUpdateSet={updateMainSet}
            onRpeChange={setRpe}
            onWorkingWeightAdjust={handleWorkingWeightAdjust}
            onNext={handleNext}
            nextExerciseName={nextExercise}
          />
        </div>
        {restTimerElement}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? 'Retrying...' : 'Try again'}
            </Button>
          </div>
        </div>
      )}

      <div className="animate-slide-right">
        <AccessoryExerciseView
          exercise={currentExercise}
          exerciseSets={exerciseSets}
          unitPreference={profile.unit_preference || 'lb'}
          lastSetData={getLastSetData(currentExercise.name)}
          suggestedWeight={getAccessorySuggestion(currentExercise.name)}
          setChecks={setChecks.accessories[exerciseIndex]}
          onToggleSetCheck={(index) => toggleAccessoryCheck(exerciseIndex, index)}
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
          onSetAsMax={!isUpperDay && newTrainingMax != null ? handleSetAsMax : undefined}
          newTrainingMax={newTrainingMax}
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
      {restTimerElement}
    </div>
  );
}
