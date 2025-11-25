import { supabase, WorkoutSession } from './supabase';

export interface AnalyticsEligibility {
  isUnlocked: boolean;
  weeksCompleted: number;
  weeksRemaining: number;
  message: string;
}

export async function checkAnalyticsUnlock(userId: string): Promise<AnalyticsEligibility> {
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: true });

  if (!sessions || sessions.length === 0) {
    return {
      isUnlocked: false,
      weeksCompleted: 0,
      weeksRemaining: 4,
      message: 'Complete workouts for 4 weeks to unlock analytics'
    };
  }

  const weekMap = new Map<string, number>();

  sessions.forEach(session => {
    const weekKey = getWeekKey(new Date(session.completed_at));
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
  });

  const qualifyingWeeks = Array.from(weekMap.entries()).filter(([_, count]) => count >= 2).length;

  const isUnlocked = qualifyingWeeks >= 4;
  const weeksRemaining = Math.max(0, 4 - qualifyingWeeks);

  let message = '';
  if (isUnlocked) {
    message = 'Analytics unlocked! View your training insights.';
  } else if (qualifyingWeeks === 0) {
    message = 'Complete at least 2 workouts per week for 4 weeks to unlock analytics';
  } else {
    message = `${weeksRemaining} more week${weeksRemaining === 1 ? '' : 's'} to unlock analytics`;
  }

  return {
    isUnlocked,
    weeksCompleted: qualifyingWeeks,
    weeksRemaining,
    message
  };
}

export function getWeekKey(date: Date): string {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function getWeeksUntilUnlock(sessionsCompleted: number): number {
  const minSessionsPerWeek = 2;
  const requiredWeeks = 4;
  const weeksCompleted = Math.floor(sessionsCompleted / minSessionsPerWeek);
  return Math.max(0, requiredWeeks - weeksCompleted);
}

export function calculateTrainingConsistency(
  actualSessions: number,
  weeksCounted: number
): number {
  if (weeksCounted === 0) return 0;
  const expectedSessions = weeksCounted * 4;
  return Math.min(actualSessions / expectedSessions, 1.0);
}

export function getAnalyticsDateRange(
  range: '4weeks' | '8weeks' | '12weeks' | 'all'
): Date {
  const now = new Date();
  switch (range) {
    case '4weeks':
      return new Date(now.setDate(now.getDate() - 28));
    case '8weeks':
      return new Date(now.setDate(now.getDate() - 56));
    case '12weeks':
      return new Date(now.setDate(now.getDate() - 84));
    case 'all':
      return new Date(0);
  }
}

export interface WeeklyStats {
  weekStartDate: string;
  totalVolume: number;
  totalSessions: number;
  averageIntensity: number;
}

export function aggregateWeeklyStats(
  sessions: WorkoutSession[],
  accessoryData: { [sessionId: string]: any[] }
): WeeklyStats[] {
  const weekMap = new Map<string, WorkoutSession[]>();

  sessions.forEach(session => {
    const weekKey = getWeekKey(new Date(session.completed_at));
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(session);
  });

  const stats: WeeklyStats[] = [];

  weekMap.forEach((weekSessions, weekKey) => {
    let totalVolume = 0;
    let totalIntensity = 0;
    let intensityCount = 0;

    weekSessions.forEach(session => {
      totalVolume += session.weight_lifted * session.reps_performed;

      const accessories = accessoryData[session.id] || [];
      accessories.forEach((exercise: any) => {
        exercise.sets_data.forEach((set: any) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          totalVolume += weight * reps;
        });
      });
    });

    const averageIntensity = intensityCount > 0 ? totalIntensity / intensityCount : 0;

    stats.push({
      weekStartDate: weekKey,
      totalVolume,
      totalSessions: weekSessions.length,
      averageIntensity
    });
  });

  return stats.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
}

export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

export function getWeekStartDate(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekEndDate(date: Date): Date {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? 0 : 7));
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}
