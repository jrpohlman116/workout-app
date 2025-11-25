import { useState, useEffect } from 'react';
import { supabase, WorkoutSession, UserProfile } from '../lib/supabase';
import {
  calculateWeeklyVolume,
  calculateWeeklyIntensity,
  calculateTrainingStressScore,
  calculateAcuteChronicRatio,
  determineFatigueStatus,
  combineObjectiveSubjective,
  generateRecoveryRecommendations,
  calculateOptimalDeloadTiming,
  getBaselineVolume,
  getWeekKey,
  getWeekStartDate
} from '../lib/fatigueCalculations';
import {
  classifyStrengthTier,
  predictFutureMax,
  calculateTrainingConsistency
} from '../lib/predictionCalculations';
import { checkAnalyticsUnlock } from '../lib/analyticsHelpers';

interface AccessoryExercise {
  id: string;
  workout_session_id: string;
  exercise_name: string;
  sets_data: { reps: string; weight: string }[];
}

interface FatigueData {
  weekStartDate: string;
  trainingStressScore: number;
  acuteChronicRatio: number;
  fatigueStatus: 'fresh' | 'optimal' | 'moderate' | 'high' | 'severe';
  perceivedExertion: number | null;
}

interface PredictionData {
  liftType: string;
  liftName: string;
  currentMax: number;
  predictionCycle1: number;
  predictionCycle2: number;
  predictionCycle3: number;
  strengthTier: string;
  improvementVelocity: number;
  confidenceScore: number;
  milestoneWeights: { [weight: number]: string };
  historicalData: { date: string; value: number }[];
}

interface AnalyticsData {
  isUnlocked: boolean;
  weeksCompleted: number;
  weeksRemaining: number;
  unlockMessage: string;
  currentWeekFatigue: FatigueData | null;
  historicalFatigue: FatigueData[];
  predictions: PredictionData[];
  recommendedAction: string;
  daysUntilDeload: number;
}

export function useAnalytics(userId: string | undefined, profile: UserProfile | null) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    isUnlocked: false,
    weeksCompleted: 0,
    weeksRemaining: 4,
    unlockMessage: '',
    currentWeekFatigue: null,
    historicalFatigue: [],
    predictions: [],
    recommendedAction: '',
    daysUntilDeload: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (userId && profile) {
      loadAnalyticsData();
    }
  }, [userId, profile]);

  const loadAnalyticsData = async () => {
    if (!userId || !profile) return;

    setLoading(true);

    try {
      const unlockStatus = await checkAnalyticsUnlock(userId);

      if (!unlockStatus.isUnlocked) {
        setAnalyticsData({
          isUnlocked: false,
          weeksCompleted: unlockStatus.weeksCompleted,
          weeksRemaining: unlockStatus.weeksRemaining,
          unlockMessage: unlockStatus.message,
          currentWeekFatigue: null,
          historicalFatigue: [],
          predictions: [],
          recommendedAction: '',
          daysUntilDeload: 0
        });
        setLoading(false);
        return;
      }

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: true });

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      const { data: accessories } = await supabase
        .from('accessory_exercises')
        .select('*')
        .in('workout_session_id', sessionIds);

      const accessoryData: { [sessionId: string]: AccessoryExercise[] } = {};
      if (accessories) {
        accessories.forEach(acc => {
          if (!accessoryData[acc.workout_session_id]) {
            accessoryData[acc.workout_session_id] = [];
          }
          accessoryData[acc.workout_session_id].push(acc);
        });
      }

      const { data: perceptions } = await supabase
        .from('workout_perceptions')
        .select('*')
        .eq('user_id', userId);

      const perceptionMap: { [sessionId: string]: number } = {};
      if (perceptions) {
        perceptions.forEach(p => {
          perceptionMap[p.workout_session_id] = p.perceived_exertion;
        });
      }

      const fatigueData = await calculateFatigueMetrics(
        sessions,
        accessoryData,
        perceptionMap,
        profile
      );

      const predictionData = await calculatePredictions(
        sessions,
        profile
      );

      const daysUntilDeload = calculateOptimalDeloadTiming(
        profile.current_cycle,
        profile.current_week,
        fatigueData.currentWeekFatigue?.fatigueStatus || 'optimal'
      );

      setAnalyticsData({
        isUnlocked: true,
        weeksCompleted: unlockStatus.weeksCompleted,
        weeksRemaining: 0,
        unlockMessage: unlockStatus.message,
        currentWeekFatigue: fatigueData.currentWeekFatigue,
        historicalFatigue: fatigueData.historicalFatigue,
        predictions: predictionData,
        recommendedAction: fatigueData.recommendedAction,
        daysUntilDeload
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFatigueMetrics = async (
    sessions: WorkoutSession[],
    accessoryData: { [sessionId: string]: AccessoryExercise[] },
    perceptionMap: { [sessionId: string]: number },
    profile: UserProfile
  ) => {
    const weekMap = new Map<string, WorkoutSession[]>();

    sessions.forEach(session => {
      const weekKey = getWeekKey(new Date(session.completed_at));
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(session);
    });

    const sortedWeeks = Array.from(weekMap.keys()).sort();
    const last8Weeks = sortedWeeks.slice(-8);

    const baselineVolume = getBaselineVolume(sessions, accessoryData);

    const userMaxes = {
      squat: profile.squat_max,
      bench: profile.bench_max,
      deadlift: profile.deadlift_max,
      ohp: profile.ohp_max
    };

    const historicalFatigue: FatigueData[] = [];
    const chronicWorkloads: number[] = [];

    last8Weeks.forEach((weekKey, index) => {
      const weekSessions = weekMap.get(weekKey)!;
      const weeklyVolume = calculateWeeklyVolume(weekSessions, accessoryData);
      const weeklyIntensity = calculateWeeklyIntensity(weekSessions, userMaxes);

      chronicWorkloads.push(weeklyVolume);
      if (chronicWorkloads.length > 4) {
        chronicWorkloads.shift();
      }

      const chronicWorkload = chronicWorkloads.reduce((a, b) => a + b, 0) / chronicWorkloads.length;
      const acRatio = calculateAcuteChronicRatio(weeklyVolume, chronicWorkload);
      const tss = calculateTrainingStressScore(weeklyVolume, weeklyIntensity, baselineVolume);

      const weekPerceivedExertion = weekSessions.reduce((sum, s) => {
        return sum + (perceptionMap[s.id] || 0);
      }, 0) / weekSessions.length || null;

      const combinedScore = combineObjectiveSubjective(tss, weekPerceivedExertion);
      const status = determineFatigueStatus(tss, acRatio);

      historicalFatigue.push({
        weekStartDate: weekKey,
        trainingStressScore: tss,
        acuteChronicRatio: acRatio,
        fatigueStatus: status,
        perceivedExertion: weekPerceivedExertion
      });
    });

    const currentWeekKey = getWeekKey(new Date());
    const currentWeekFatigue = historicalFatigue.find(f => f.weekStartDate === currentWeekKey) || historicalFatigue[historicalFatigue.length - 1];

    const daysUntilDeload = calculateOptimalDeloadTiming(
      profile.current_cycle,
      profile.current_week,
      currentWeekFatigue?.fatigueStatus || 'optimal'
    );

    const recommendedAction = generateRecoveryRecommendations(
      currentWeekFatigue?.fatigueStatus || 'optimal',
      daysUntilDeload
    );

    return {
      currentWeekFatigue,
      historicalFatigue,
      recommendedAction
    };
  };

  const calculatePredictions = async (
    sessions: WorkoutSession[],
    profile: UserProfile
  ): Promise<PredictionData[]> => {
    const liftTypes = [
      { type: 'squat', name: 'Squat', max: profile.squat_max },
      { type: 'bench', name: 'Bench Press', max: profile.bench_max },
      { type: 'deadlift', name: 'Deadlift', max: profile.deadlift_max },
      { type: 'ohp', name: 'Overhead Press', max: profile.ohp_max }
    ];

    const tier = classifyStrengthTier(
      profile.squat_max,
      profile.bench_max,
      profile.deadlift_max,
      profile.ohp_max,
      profile.bodyweight || 170,
      profile.gender || 'male'
    );

    const totalWeeks = new Set(sessions.map(s => getWeekKey(new Date(s.completed_at)))).size;
    const consistency = calculateTrainingConsistency(sessions.length, totalWeeks * 4);

    const predictions: PredictionData[] = [];

    for (const lift of liftTypes) {
      const liftSessions = sessions.filter(s => s.lift_type === lift.type);
      const nonDeloadSessions = liftSessions.filter(s => s.week !== 4);

      const prediction = predictFutureMax(
        lift.type,
        sessions,
        lift.max,
        tier,
        consistency,
        1.0
      );

      predictions.push({
        liftType: lift.type,
        liftName: lift.name,
        currentMax: lift.max,
        predictionCycle1: prediction.predictionCycle1,
        predictionCycle2: prediction.predictionCycle2,
        predictionCycle3: prediction.predictionCycle3,
        strengthTier: prediction.strengthTier,
        improvementVelocity: prediction.improvementVelocity,
        confidenceScore: prediction.confidenceScore,
        milestoneWeights: prediction.milestoneWeights,
        historicalData: nonDeloadSessions.map(s => ({
          date: s.completed_at,
          value: s.calculated_1rm
        }))
      });
    }

    return predictions;
  };

  const refresh = () => {
    setLastRefresh(new Date());
    loadAnalyticsData();
  };

  return {
    ...analyticsData,
    loading,
    lastRefresh,
    refresh
  };
}
