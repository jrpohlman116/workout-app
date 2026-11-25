import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { WeakPoints } from '../lib/supabase';
import type { WavePhase, Exercise } from '../lib/types';
import { getLayout } from '../lib/programs/registry';
import type { DayDef } from '../lib/programs/types';
import {
  baseExercises,
  BARBELL_VARIATION_LIFTS,
  getWeakPointSources,
  type SplitStyle,
  applyPhaseToAccessories,
  resolveDayExercises,
  VariationContribution,
} from '../lib/exercises';

// Days scanned when the caller doesn't pass its own layout.
const DEFAULT_DAYS: readonly DayDef[] = getLayout(undefined, undefined).days;
const CREDIT_PHASES: WavePhase[] = ['accumulation', 'intensification'];

interface UseWeeklyVariationCreditResult {
  /** undefined until resolved for the current inputs. Callers that lock in
      a value permanently (e.g. the initial main-set count) must wait for
      this to become a number rather than defaulting it to 0, or a slow
      network response would let the wrong count stick. */
  variationSetsPlanned: number | undefined;
  contributions: VariationContribution[];
  loading: boolean;
}

/**
 * Sums barbell-variation accessory sets planned on OTHER days that count
 * toward `targetLift`'s weekly volume (e.g. Pin Squats on deadlift day
 * count toward squat, via the cross-day weak-point map — but every other
 * day is scanned, not just the canonical cross-day partner, so a manually
 * added variation anywhere still counts). No-ops with zero network calls
 * outside accumulation/intensification, since the main day's prescription
 * only redistributes during those two phases.
 *
 * Freshness is derived at render time from a key of every input (rather
 * than an async `loading` flag alone) so `variationSetsPlanned` is
 * correctly `undefined` on the very first render where it becomes
 * eligible — no one-tick race where a stale default could get captured.
 */
export function useWeeklyVariationCredit(
  userId: string | undefined,
  targetLift: string,
  phase: WavePhase | undefined,
  weakPoints: WeakPoints | undefined,
  style?: SplitStyle,
  /** Days of the user's layout; defaults to the program's default layout. */
  days: readonly Pick<DayDef, 'dayId' | 'variationSlots'>[] = DEFAULT_DAYS
): UseWeeklyVariationCreditResult {
  const isMainLift = targetLift === 'squat' || targetLift === 'bench' || targetLift === 'deadlift';
  const eligible = !!userId && isMainLift && !!phase && CREDIT_PHASES.includes(phase);
  const weakPointsKey = JSON.stringify(weakPoints ?? {});
  const currentKey = `${userId ?? ''}|${targetLift}|${phase ?? ''}|${style ?? ''}|${days.map(d => `${d.dayId}:${(d.variationSlots ?? []).join('+')}`).join(',')}|${weakPointsKey}`;

  const [resolved, setResolved] = useState<{ key: string; contributions: VariationContribution[] } | null>(null);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    const otherDayDefs = days.filter(d => d.dayId !== targetLift);
    const otherDays = otherDayDefs.map(d => d.dayId);

    (async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId as string)
        .eq('program_variation', 'standard')
        .in('lift_type', otherDays);

      if (cancelled) return;

      const templateByType = new Map<string, Exercise[]>();
      if (!error && data) {
        (data as { lift_type: string; exercises_data: Exercise[] }[]).forEach(row => {
          templateByType.set(row.lift_type, row.exercises_data);
        });
      }

      const found: VariationContribution[] = [];
      for (const { dayId: day, variationSlots } of otherDayDefs) {
        const dayDefaults = baseExercises[day as keyof typeof baseExercises] ?? baseExercises.upper;
        const [primary] = getWeakPointSources(day, style, variationSlots);
        const dayWeakPoints = primary ? weakPoints?.[primary.profileLift] : undefined;
        const dayExercises = resolveDayExercises(day, templateByType.get(day) ?? null, dayWeakPoints, dayDefaults, style, weakPoints, variationSlots);
        const { exercises: phaseAdjusted } = applyPhaseToAccessories(dayExercises, phase, day);

        phaseAdjusted.forEach(ex => {
          if (BARBELL_VARIATION_LIFTS[ex.name] === targetLift) {
            found.push({ dayLiftType: day, exerciseName: ex.name, sets: ex.sets });
          }
        });
      }

      if (!cancelled) setResolved({ key: currentKey, contributions: found });
      // currentKey is captured fresh each call via the async closure, so
      // a stale response from a superseded key never overwrites a newer one
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, eligible]);

  const isFresh = resolved?.key === currentKey;
  const contributions = eligible && isFresh ? resolved!.contributions : [];
  const variationSetsPlanned = !eligible ? 0 : (isFresh ? contributions.reduce((sum, c) => sum + c.sets, 0) : undefined);
  const loading = eligible && !isFresh;

  return { variationSetsPlanned, contributions, loading };
}
