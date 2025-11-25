import { WorkoutSession } from './supabase';
import { calculateWilksScore } from './calculations';

export interface PredictionResult {
  predictionCycle1: number;
  predictionCycle2: number;
  predictionCycle3: number;
  strengthTier: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  improvementVelocity: number;
  confidenceScore: number;
  milestoneWeights: { [weight: number]: string };
  metadata: {
    currentMax: number;
    dataPoints: number;
    consistencyScore: number;
    regressionSlope: number;
    adjustedRate: number;
  };
}

export function classifyStrengthTier(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  ohpMax: number,
  bodyweight: number,
  gender: string
): 'beginner' | 'intermediate' | 'advanced' | 'elite' {
  const wilks = calculateWilksScore(squatMax, benchMax, deadliftMax, bodyweight, gender);

  if (wilks < 250) return 'beginner';
  if (wilks < 350) return 'intermediate';
  if (wilks < 450) return 'advanced';
  return 'elite';
}

export function calculateBaselineImprovement(sessions: WorkoutSession[]): number {
  if (sessions.length < 2) return 0;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );

  const n = sortedSessions.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  sortedSessions.forEach((session, index) => {
    const x = index;
    const y = session.calculated_1rm;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  return slope;
}

export function applyPeriodizationAdjustment(
  baselineRate: number,
  tier: 'beginner' | 'intermediate' | 'advanced' | 'elite'
): number {
  const tierMultipliers = {
    beginner: 2.5,
    intermediate: 1.5,
    advanced: 0.75,
    elite: 0.4
  };

  const cycleMultiplier = tierMultipliers[tier];
  return cycleMultiplier;
}

export function applyDiminishingReturns(
  improvementRate: number,
  currentMax: number
): number {
  const diminishingFactor = 1 / (1 + 0.002 * currentMax);
  return improvementRate * diminishingFactor;
}

export function predictFutureMax(
  liftType: string,
  sessions: WorkoutSession[],
  currentMax: number,
  tier: 'beginner' | 'intermediate' | 'advanced' | 'elite',
  trainingConsistency: number,
  chronicFatigue: number
): PredictionResult {
  const nonDeloadSessions = sessions.filter(s => s.lift_type === liftType && s.week !== 4);

  if (nonDeloadSessions.length < 4) {
    return {
      predictionCycle1: currentMax,
      predictionCycle2: currentMax,
      predictionCycle3: currentMax,
      strengthTier: tier,
      improvementVelocity: 0,
      confidenceScore: 0,
      milestoneWeights: {},
      metadata: {
        currentMax,
        dataPoints: nonDeloadSessions.length,
        consistencyScore: trainingConsistency,
        regressionSlope: 0,
        adjustedRate: 0
      }
    };
  }

  const regressionSlope = calculateBaselineImprovement(nonDeloadSessions);
  const baseRate = applyPeriodizationAdjustment(regressionSlope, tier);
  const diminishedRate = applyDiminishingReturns(baseRate, currentMax);

  let adjustedRate = diminishedRate;
  if (trainingConsistency < 0.8) {
    adjustedRate *= trainingConsistency;
  }
  if (chronicFatigue > 1.4) {
    adjustedRate *= 0.9;
  }

  const prediction1 = Math.round(currentMax + adjustedRate);
  const prediction2 = Math.round(currentMax + adjustedRate * 2);
  const prediction3 = Math.round(currentMax + adjustedRate * 3);

  const confidence = calculateConfidenceScore(
    nonDeloadSessions,
    trainingConsistency
  );

  const milestones = estimateMilestoneWeights(
    currentMax,
    adjustedRate,
    liftType
  );

  return {
    predictionCycle1: prediction1,
    predictionCycle2: prediction2,
    predictionCycle3: prediction3,
    strengthTier: tier,
    improvementVelocity: Math.round(adjustedRate * 100) / 100,
    confidenceScore: confidence,
    milestoneWeights: milestones,
    metadata: {
      currentMax,
      dataPoints: nonDeloadSessions.length,
      consistencyScore: Math.round(trainingConsistency * 100),
      regressionSlope: Math.round(regressionSlope * 100) / 100,
      adjustedRate: Math.round(adjustedRate * 100) / 100
    }
  };
}

export function calculateConfidenceScore(
  sessions: WorkoutSession[],
  trainingConsistency: number
): number {
  if (sessions.length < 4) return 0;

  const dataPointScore = Math.min(sessions.length / 12, 1) * 40;

  const values = sessions.map(s => s.calculated_1rm);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  const varianceScore = Math.max(0, (1 - coefficientOfVariation * 5)) * 30;

  const consistencyScore = trainingConsistency * 30;

  return Math.round(Math.min(dataPointScore + varianceScore + consistencyScore, 100));
}

export function estimateMilestoneWeights(
  currentMax: number,
  improvementRate: number,
  liftType: string
): { [weight: number]: string } {
  const milestones: { [weight: number]: string } = {};

  const standardMilestones = [135, 185, 225, 275, 315, 365, 405, 455, 495, 545, 585, 635];

  const relevantMilestones = standardMilestones.filter(m => m > currentMax && m <= currentMax + 200);

  relevantMilestones.forEach(milestone => {
    const weightDifference = milestone - currentMax;
    const cyclesNeeded = Math.ceil(weightDifference / improvementRate);
    const weeksNeeded = cyclesNeeded * 4;

    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + weeksNeeded * 7);

    milestones[milestone] = projectedDate.toISOString().split('T')[0];
  });

  return milestones;
}

export function calculateTrainingConsistency(
  totalSessions: number,
  expectedSessions: number
): number {
  if (expectedSessions === 0) return 1.0;
  return Math.min(totalSessions / expectedSessions, 1.0);
}

export function generatePredictionExplanation(
  result: PredictionResult,
  liftName: string
): string {
  const { strengthTier, improvementVelocity, confidenceScore, metadata } = result;

  let explanation = `Your ${liftName} prediction is based on ${metadata.dataPoints} training sessions. `;
  explanation += `As a ${strengthTier} lifter, we expect approximately ${Math.round(improvementVelocity)} lbs per cycle. `;

  if (confidenceScore >= 80) {
    explanation += `High confidence (${confidenceScore}%) due to consistent training.`;
  } else if (confidenceScore >= 60) {
    explanation += `Moderate confidence (${confidenceScore}%). Continue consistent training to improve accuracy.`;
  } else {
    explanation += `Lower confidence (${confidenceScore}%). More training data needed for accurate predictions.`;
  }

  return explanation;
}
