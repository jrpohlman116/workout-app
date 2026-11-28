import { getProgram } from './programs/registry';
import { trainingMaxFromOneRepMax } from './programs/maxes';
import { planPeakBlock } from './programs/shared/peakBlock';
import type { DaysPerWeek, LiftId, Unit, WeekBlock } from './programs/types';

// Pure helpers for onboarding (UX handoff, phase 7). New lifters start on
// 5/3/1 (decision 1); the first-wave preview uses the same engine and plate
// rounding as Today, so the numbers shown are the numbers they'll lift.

export type TrainingGoal = 'compete' | 'stronger' | 'lift_and_run';
export type RunningDays = '0' | '1-2' | '3+';

export const ONBOARDING_PROGRAM = 'five_three_one' as const;

export interface FirstWaveLift {
  lift: LiftId;
  trainingMax: number;
  top: { weight: number; reps: number };
  backoff: { weight: number; reps: number } | null;
}

/** Week 1 loads for each lift with a max, in the layout's day order. */
export function firstWave(args: {
  days: DaysPerWeek;
  oneRepMaxes: Partial<Record<LiftId, number>>;
  unit: Unit;
  plates: readonly number[];
}): FirstWaveLift[] {
  const program = getProgram(ONBOARDING_PROGRAM);
  const block: WeekBlock = { phase: 'accumulation', weekIndex: 0, cycleIndex: 0, startDate: new Date(), endDate: new Date() };
  return program.layout(args.days).days
    .map(d => d.primary)
    .filter((l): l is LiftId => !!l && (args.oneRepMaxes[l] ?? 0) > 0)
    .map(lift => {
      const trainingMax = trainingMaxFromOneRepMax(args.oneRepMaxes[lift]!, lift, args.unit);
      const groups = program.prescribe({ block, lift, trainingMax, unit: args.unit, plates: args.plates }).groups;
      const top = groups.find(g => g.kind === 'top')!;
      const back = groups.find(g => g.kind === 'backoff');
      return {
        lift,
        trainingMax,
        top: { weight: top.weight, reps: top.reps },
        backoff: back ? { weight: back.weight, reps: back.reps } : null,
      };
    });
}

/** "Three 4-week waves, then a 3-week peak and meet week." */
export function programStructure(weeksAway: number): string {
  const plan = planPeakBlock(weeksAway, 4);
  if (plan.cycles < 1) return 'Not enough time for a full wave before then. A later date gives you a real build.';
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
  const count = words[plan.cycles] ?? String(plan.cycles);
  return `${count} 4-week ${plan.cycles === 1 ? 'wave' : 'waves'}, then a ${plan.peakWeeks}-week peak and meet week.`;
}
