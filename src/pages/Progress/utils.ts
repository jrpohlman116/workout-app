import { WorkoutSession } from '../../lib/supabase';
import { calculateWilksScore, calculateDOTSScore, calculateIPFGLScore } from '../../lib/calculations';

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Maxes { squat: number; bench: number; deadlift: number }

export function calculateStrengthScores(
  initialMaxes: Maxes,
  effectiveMaxes: Maxes,
  bodyweight: number,
  gender: string,
  toKg: (w: number) => number
) {
  const calc = (m: Maxes) => ({
    wilks: calculateWilksScore(toKg(m.squat), toKg(m.bench), toKg(m.deadlift), toKg(bodyweight), gender),
    dots:  calculateDOTSScore(toKg(m.squat), toKg(m.bench), toKg(m.deadlift), toKg(bodyweight), gender),
    ipfgl: calculateIPFGLScore(toKg(m.squat), toKg(m.bench), toKg(m.deadlift), toKg(bodyweight), gender),
  });

  const initial   = calc(initialMaxes);
  const projected = calc(effectiveMaxes);
  const changePercents = {
    wilks: initial.wilks > 0 ? (((projected.wilks - initial.wilks) / initial.wilks) * 100).toFixed(1) : '0.0',
    dots:  initial.dots  > 0 ? (((projected.dots  - initial.dots)  / initial.dots)  * 100).toFixed(1) : '0.0',
    ipfgl: initial.ipfgl > 0 ? (((projected.ipfgl - initial.ipfgl) / initial.ipfgl) * 100).toFixed(1) : '0.0',
  };

  return { initial, projected, changePercents };
}

export function calculateTonnage(session: WorkoutSession): number {
  return session.weight_lifted * session.reps_performed;
}

export function getFirstRecordedMax(sessions: WorkoutSession[], liftType: string): number {
  const liftSessions = sessions.filter(s => s.lift_type === liftType);
  if (liftSessions.length === 0) return 0;

  const sortedByDate = [...liftSessions].sort((a, b) =>
    new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );

  return sortedByDate[0].calculated_1rm;
}

export function getAverageOfLastThreeSessions(nonDeloadSessions: WorkoutSession[], liftType: string): number {
  const liftSessions = nonDeloadSessions.filter(s => s.lift_type === liftType);
  if (liftSessions.length === 0) return 0;

  const lastThree = liftSessions.slice(-3);
  const sum = lastThree.reduce((total, session) => total + session.calculated_1rm, 0);
  return Math.round(sum / lastThree.length);
}

export function getMaxChangePercent(sessions: WorkoutSession[], nonDeloadSessions: WorkoutSession[], liftType: string): string {
  const firstRecorded = getFirstRecordedMax(sessions, liftType);
  const currentAverage = getAverageOfLastThreeSessions(nonDeloadSessions, liftType);

  if (firstRecorded === 0) return '0';
  return (((currentAverage - firstRecorded) / firstRecorded) * 100).toFixed(1);
}

export function getBestWeightForLift(sessions: WorkoutSession[], liftType: string) {
  const liftSessions = sessions.filter(s => s.lift_type === liftType);
  if (liftSessions.length === 0) return null;

  let bestSession = liftSessions[0];
  liftSessions.forEach(session => {
    if (session.weight_lifted > bestSession.weight_lifted) {
      bestSession = session;
    }
  });

  return bestSession;
}

export function getBestVolumeForLift(sessions: WorkoutSession[], liftType: string) {
  const liftSessions = sessions.filter(s => s.lift_type === liftType);
  if (liftSessions.length === 0) return null;

  let bestSession = liftSessions[0];
  let bestTonnage = calculateTonnage(bestSession);

  liftSessions.forEach(session => {
    const tonnage = calculateTonnage(session);
    if (tonnage > bestTonnage) {
      bestSession = session;
      bestTonnage = tonnage;
    }
  });

  return { session: bestSession, tonnage: bestTonnage };
}
