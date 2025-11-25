import { WorkoutSession } from './supabase';

export interface FatigueData {
  weeklyVolume: number;
  weeklyIntensity: number;
  trainingStressScore: number;
  acuteWorkload: number;
  chronicWorkload: number;
  acuteChronicRatio: number;
  fatigueStatus: 'fresh' | 'optimal' | 'moderate' | 'high' | 'severe';
  recommendedAction: string;
}

interface AccessoryExercise {
  sets_data: { reps: string; weight: string }[];
}

export function calculateWeeklyVolume(
  sessions: WorkoutSession[],
  accessoryData: { [sessionId: string]: AccessoryExercise[] }
): number {
  let totalVolume = 0;

  sessions.forEach(session => {
    totalVolume += session.weight_lifted * session.reps_performed;

    const accessories = accessoryData[session.id] || [];
    accessories.forEach(exercise => {
      exercise.sets_data.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        totalVolume += weight * reps;
      });
    });
  });

  return totalVolume;
}

export function calculateWeeklyIntensity(
  sessions: WorkoutSession[],
  userMaxes: { [liftType: string]: number }
): number {
  if (sessions.length === 0) return 0;

  let totalIntensity = 0;
  let validSessions = 0;

  sessions.forEach(session => {
    const userMax = userMaxes[session.lift_type];
    if (userMax && userMax > 0) {
      const intensity = (session.weight_lifted / userMax) * 100;
      totalIntensity += intensity;
      validSessions++;
    }
  });

  return validSessions > 0 ? totalIntensity / validSessions : 0;
}

export function calculateTrainingStressScore(
  weeklyVolume: number,
  weeklyIntensity: number,
  baselineVolume: number
): number {
  if (baselineVolume === 0) return 50;

  const volumeRatio = weeklyVolume / baselineVolume;
  const intensityFactor = weeklyIntensity / 100;

  const tss = volumeRatio * intensityFactor * 100;

  return Math.min(Math.max(tss, 0), 150);
}

export function calculateAcuteChronicRatio(
  acuteWorkload: number,
  chronicWorkload: number
): number {
  if (chronicWorkload === 0) return 1.0;
  return acuteWorkload / chronicWorkload;
}

export function determineFatigueStatus(
  tss: number,
  acRatio: number
): 'fresh' | 'optimal' | 'moderate' | 'high' | 'severe' {
  if (acRatio < 0.8 || tss < 60) return 'fresh';
  if (acRatio >= 0.8 && acRatio <= 1.3 && tss >= 60 && tss <= 120) return 'optimal';
  if (acRatio > 1.3 && acRatio <= 1.5 || (tss > 120 && tss <= 130)) return 'moderate';
  if (acRatio > 1.5 && acRatio <= 1.8 || (tss > 130 && tss <= 140)) return 'high';
  return 'severe';
}

export function combineObjectiveSubjective(
  calculatedScore: number,
  perceivedExertion: number | null,
  objectiveWeight: number = 0.6
): number {
  if (perceivedExertion === null) {
    return calculatedScore;
  }

  const subjectiveScore = (perceivedExertion / 10) * 100;
  const subjectiveWeight = 1 - objectiveWeight;

  return calculatedScore * objectiveWeight + subjectiveScore * subjectiveWeight;
}

export function generateRecoveryRecommendations(
  status: 'fresh' | 'optimal' | 'moderate' | 'high' | 'severe',
  daysUntilDeload: number
): string {
  switch (status) {
    case 'fresh':
      return 'You\'re well-recovered! Consider increasing training volume or intensity if you feel strong.';
    case 'optimal':
      return 'Perfect training load. Maintain current intensity and volume for continued progress.';
    case 'moderate':
      return 'Slight fatigue accumulating. Ensure adequate sleep and nutrition. Consider a lighter week if fatigue persists.';
    case 'high':
      if (daysUntilDeload <= 7) {
        return `High fatigue detected. Your deload week is coming in ${daysUntilDeload} days. Focus on recovery and consider reducing accessory volume.`;
      }
      return 'High fatigue detected. Prioritize sleep, reduce accessory work, and consider taking an extra rest day this week.';
    case 'severe':
      return 'Severe fatigue! Take an extra rest day immediately. Consider starting your deload week early to prevent overtraining and injury.';
    default:
      return 'Continue with your programmed training.';
  }
}

export function calculateOptimalDeloadTiming(
  currentCycle: number,
  currentWeek: number,
  fatigueStatus: 'fresh' | 'optimal' | 'moderate' | 'high' | 'severe'
): number {
  const weeksInCycle = 4;
  const weeksRemaining = weeksInCycle - currentWeek;

  if (fatigueStatus === 'severe' && weeksRemaining > 1) {
    return 0;
  }

  const nextDeloadWeek = (currentCycle * weeksInCycle) + weeksInCycle;
  const currentWeekNumber = ((currentCycle - 1) * weeksInCycle) + currentWeek;

  return nextDeloadWeek - currentWeekNumber;
}

export function getBaselineVolume(
  allSessions: WorkoutSession[],
  accessoryData: { [sessionId: string]: AccessoryExercise[] }
): number {
  if (allSessions.length === 0) return 10000;

  const weeks = new Map<string, WorkoutSession[]>();

  allSessions.forEach(session => {
    const weekKey = getWeekKey(new Date(session.completed_at));
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey)!.push(session);
  });

  const weeklyVolumes = Array.from(weeks.values()).map(weekSessions =>
    calculateWeeklyVolume(weekSessions, accessoryData)
  );

  const sum = weeklyVolumes.reduce((a, b) => a + b, 0);
  return weeklyVolumes.length > 0 ? sum / weeklyVolumes.length : 10000;
}

export function getWeekKey(date: Date): string {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function getWeekStartDate(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
