import type { StickingPoint } from './supabase';
import type { Exercise, WavePhase } from './types';

export const liftNames: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
  upper: 'Upper Body',
};

export const liftNamesShort: Record<string, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  upper: 'Upper',
};

// Squat day: deadlift accessories (cross-day prescription)
// Deadlift day: squat accessories
// Bench day: bench support
// Upper day: bench weak-point focused accessories
export const baseExercises = {
  squat: [
    { name: 'Romanian Deadlift', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Plank', reps: '30-60 sec', sets: 3, isBodyweight: true },
  ],
  bench: [
    { name: 'Incline DB Press', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Barbell Curls', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Tricep Pressdowns', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
  ],
  deadlift: [
    { name: 'Bulgarian Split Squats', reps: '8-10', sets: 3, isBodyweight: false },
    { name: 'Leg Press', reps: '5-8', sets: 3, isBodyweight: false },
    { name: 'Abs', reps: '10-15 min', sets: 3, isBodyweight: true },
    { name: 'B Stance RDLs', reps: '8-12', sets: 3, isBodyweight: false },
  ],
  upper: [
    { name: 'Incline DB Press', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Close-Grip Bench', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
    { name: 'Lateral Raise Complex', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Tricep Pressdowns', reps: '8-12', sets: 3, isBodyweight: false },
  ],
};

export const additionalExercises = [
  { name: 'Box Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pause Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Front Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Goblet Squats', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Walking Lunges', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Leg Extensions', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Seated Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Hip Thrusts', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Hip Abduction', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Nordic Curls', reps: '5-8', sets: 3, isBodyweight: true },
  { name: 'Chin-Ups', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Pull-Ups', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Chest Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Cable Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Shrugs', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Farmer Walks', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Anderson Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Safety Bar Box Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Tempo Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pin Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: '3-Second Pause Squat', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'Single-Leg Squats', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Single-Leg Calf Raises', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Donkey Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Jump Rope', reps: '60-120 sec', sets: 3, isBodyweight: true },
  { name: 'Lateral Band Walks', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Clamshells', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Fire Hydrants', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Cable Hip Abduction', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Sissy Squats', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Spanish Squats', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Terminal Knee Extensions', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Zercher Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Safety Bar Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'High Bar Squats', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Bodyweight Squats', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Dumbbell Squats', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Kettlebell Squats', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Static Lunges', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Reverse Lunges', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Step-Ups', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Leg Press Calf Raises', reps: '15-20', sets: 3, isBodyweight: false },
  { name: 'Single-Leg Seated Calf Raises', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Tibialis Raises', reps: '15-20', sets: 3, isBodyweight: true },
  { name: 'Glute Bridges', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Single-Leg Hip Thrusts', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Cable Pull-Throughs', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Kettlebell Swings', reps: '12-15', sets: 3, isBodyweight: false },
  { name: 'Eccentric Leg Curls', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Partner Hamstring Curls', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Glute Ham Raise', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Slider Hamstring Curls', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Assisted Chin-Ups', reps: '8-12', sets: 3, isBodyweight: true },
  { name: 'Underhand Lat Pulldowns', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Weighted Chin-Ups', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Lat Pulldowns', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Neutral Grip Pull-Ups', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Weighted Pull-Ups', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pec Deck Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Push-Up Plus', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Dumbbell Press', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Dumbbell Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Resistance Band Flyes', reps: '12-15', sets: 3, isBodyweight: true },
  { name: 'Low-to-High Cable Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'High-to-Low Cable Flyes', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Overhead Shrugs', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Rack Pulls', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pin Pulls', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'Partial Deadlifts', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'Deficit Deadlift', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Tempo Deadlifts', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Paused Deadlifts', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Suitcase Carry', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Overhead Carry', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Rack Position Carry', reps: '30-60 sec', sets: 3, isBodyweight: false },
  { name: 'Spoto Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pin Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Board Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Pause Bench', reps: '5-8', sets: 3, isBodyweight: false },
  { name: '3-Second Pause Bench', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'Feet-Up Bench', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Deep Stretch DB Bench', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Incline Bench', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Floor Press', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Lockout Bench', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'JM Press', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Dips', reps: '6-10', sets: 3, isBodyweight: true },
  { name: 'Back Extensions', reps: '10-15', sets: 3, isBodyweight: true },
  { name: 'Skull Crushers', reps: '8-12', sets: 3, isBodyweight: false },
  { name: 'Overhead Tricep Extension', reps: '10-15', sets: 3, isBodyweight: false },
  { name: 'Rear Delt Flyes', reps: '12-15', sets: 3, isBodyweight: false },
];

// Barbell variations of a main lift, scaled as a % of that lift's training
// max — the rest of the accessory pool (leg press, cable flyes, etc.) has no
// natural %TM basis and isn't included. These are starting-point estimates,
// not prescriptions; a lifter should still adjust based on how the pause/
// range-of-motion/leverage change actually feels.
export const ACCESSORY_PCT_OF_TM: Record<string, { baseLift: 'squat' | 'bench' | 'deadlift'; pct: number }> = {
  'Box Squats': { baseLift: 'squat', pct: 0.70 },
  'Pause Squats': { baseLift: 'squat', pct: 0.75 },
  'Front Squats': { baseLift: 'squat', pct: 0.65 },
  'Anderson Squats': { baseLift: 'squat', pct: 0.65 },
  'Safety Bar Box Squats': { baseLift: 'squat', pct: 0.70 },
  'Tempo Squats': { baseLift: 'squat', pct: 0.60 },
  'Pin Squats': { baseLift: 'squat', pct: 0.70 },
  'Zercher Squats': { baseLift: 'squat', pct: 0.60 },
  'Safety Bar Squats': { baseLift: 'squat', pct: 0.80 },
  'High Bar Squats': { baseLift: 'squat', pct: 0.80 },
  'Spoto Press': { baseLift: 'bench', pct: 0.70 },
  'Pin Press': { baseLift: 'bench', pct: 0.70 },
  'Board Press': { baseLift: 'bench', pct: 0.85 },
  'Pause Bench': { baseLift: 'bench', pct: 0.80 },
  'Close-Grip Bench': { baseLift: 'bench', pct: 0.80 },
  'Incline Bench': { baseLift: 'bench', pct: 0.70 },
  'Floor Press': { baseLift: 'bench', pct: 0.75 },
  'Lockout Bench': { baseLift: 'bench', pct: 0.90 },
  'JM Press': { baseLift: 'bench', pct: 0.55 },
  'Rack Pulls': { baseLift: 'deadlift', pct: 0.90 },
  'Pin Pulls': { baseLift: 'deadlift', pct: 0.85 },
  'Partial Deadlifts': { baseLift: 'deadlift', pct: 0.90 },
  'Deficit Deadlift': { baseLift: 'deadlift', pct: 0.75 },
  'Tempo Deadlifts': { baseLift: 'deadlift', pct: 0.65 },
  'Paused Deadlifts': { baseLift: 'deadlift', pct: 0.70 },
};

// Barbell variations that intentionally have no ACCESSORY_PCT_OF_TM weight
// suggestion yet (added 2026-07-21, pending the %TM recalibration pass —
// see the roadmap) but are still real barbell lifts of the same lift
// pattern. Dumbbell/machine variations (e.g. Deep Stretch DB Bench) are
// deliberately excluded — they don't create the same axial-loading
// same-day-stacking concern this list exists to guard against.
const BARBELL_VARIATIONS_WITHOUT_PCT: Record<string, 'squat' | 'bench' | 'deadlift'> = {
  '3-Second Pause Squat': 'squat',
  '3-Second Pause Bench': 'bench',
  'Feet-Up Bench': 'bench',
};

// Every barbell variation of a main lift, regardless of whether it has a
// weight suggestion — the definition used anywhere the concern is "is this
// heavy barbell work of the same pattern" rather than "what should it
// weigh": the same-day 1-barbell cap, the peaking drop filter, and weekly-
// volume credit. ACCESSORY_PCT_OF_TM alone is NOT this list — it's scoped
// to weight suggestions only, and some barbell variations deliberately
// don't have one yet.
export const BARBELL_VARIATION_LIFTS: Record<string, 'squat' | 'bench' | 'deadlift'> = {
  ...Object.fromEntries(Object.entries(ACCESSORY_PCT_OF_TM).map(([name, v]) => [name, v.baseLift])),
  ...BARBELL_VARIATIONS_WITHOUT_PCT,
};

export const weakPointExercisesMap: Record<string, Record<StickingPoint, string[]>> = {
  squat: {
    in_the_hole: ['Box Squats', 'Anderson Squats', 'Pin Squats', 'Pause Squats', 'Bulgarian Split Squats', '3-Second Pause Squat'],
    mid_range:   ['Pin Squats', 'Tempo Squats', 'Front Squats', 'Pause Squats', 'Leg Press'],
    lockout:     ['Walking Lunges', 'Single-Leg Squats', 'Safety Bar Box Squats', 'Leg Extensions', 'Hip Thrusts'],
  },
  bench: {
    in_the_hole: ['Incline DB Press', 'Board Press', 'Pin Press', 'Spoto Press', 'Pause Bench', '3-Second Pause Bench', 'Feet-Up Bench', 'Deep Stretch DB Bench'],
    mid_range:   ['Close-Grip Bench', 'Pin Press', 'Pause Bench', 'Incline Bench', 'Floor Press'],
    lockout:     ['Floor Press', 'Board Press', 'Close-Grip Bench', 'Tricep Pressdowns', 'JM Press'],
  },
  deadlift: {
    in_the_hole: ['Deficit Deadlift', 'Paused Deadlifts', 'Front Squats', 'Pause Squats', 'Step-Ups'],
    mid_range:   ['Tempo Deadlifts', 'Paused Deadlifts', 'Pin Pulls', 'Partial Deadlifts', 'Rack Pulls'],
    lockout:     ['Rack Pulls', 'Pin Pulls', 'Partial Deadlifts', 'Shrugs', 'B Stance RDLs'],
  },
  upper: {
    in_the_hole: ['Incline DB Press', 'Board Press', 'Pin Press', 'Spoto Press', 'Pause Bench', '3-Second Pause Bench', 'Feet-Up Bench', 'Deep Stretch DB Bench'],
    mid_range:   ['Close-Grip Bench', 'Pin Press', 'Pause Bench', 'JM Press', 'Floor Press'],
    lockout:     ['Floor Press', 'Board Press', 'Close-Grip Bench', 'Tricep Pressdowns', 'Lockout Bench'],
  },
};

// General-support fill follows the same cross-day principle as baseExercises:
// squat day fills with posterior-chain (deadlift-supporting) work, deadlift
// day with quad/core (squat-supporting) work. Lists are ordered — fill takes
// from the front — so the two days must not share leading exercises, or every
// user ends up with identical accessories on both days.
export const generalSupportExercises: Record<string, string[]> = {
  squat:    ['Romanian Deadlift', 'Leg Curls', 'Barbell Rows', 'Plank', 'Calf Raises', 'Hip Thrusts', 'Farmer Walks'],
  bench:    ['Barbell Curls', 'Face Pulls', 'Chest Flyes', 'Cable Flyes', 'Dips', 'Chin-Ups', 'Pull-Ups'],
  deadlift: ['Bulgarian Split Squats', 'Abs', 'Leg Extensions', 'Goblet Squats', 'Calf Raises', 'Step-Ups', 'Sissy Squats'],
  upper:    ['Face Pulls', 'Lateral Raise Complex', 'Chest Flyes', 'Cable Flyes', 'Dips', 'Chin-Ups', 'Pull-Ups'],
};

// How each phase reshapes the day's accessory prescription. Applied at
// render time only — saved templates keep deciding exercise identity and
// are never mutated by phase adjustments. `note` is surfaced in the UI so
// the program never silently changes what a week looks like.
export const ACCESSORY_PHASE_PLAN: Record<WavePhase, {
  setsDelta?: number;
  setsOverride?: number;
  maxExercises?: number;
  dropBarbellVariations?: boolean;
  note: string;
}> = {
  accumulation:    { setsDelta: 1, note: 'Volume phase — one extra set on each accessory.' },
  intensification: { note: '' },
  realization:     { note: '' },
  deload:          { setsOverride: 2, note: 'Deload — 2 light sets each. Nothing close to failure.' },
  peaking:         {
    setsOverride: 2,
    maxExercises: 3,
    dropBarbellVariations: true,
    note: 'Peaking — heavy barbell variations are dropped. Light upper-back, shoulder and core work keeps you moving without adding fatigue.',
  },
  meet_week:       { setsOverride: 0, maxExercises: 0, note: 'Meet week — no accessories.' },
};

function findExerciseDef(name: string): Exercise | null {
  for (const day of Object.values(baseExercises)) {
    const found = day.find(ex => ex.name === name);
    if (found) return found;
  }
  return additionalExercises.find(ex => ex.name === name) ?? null;
}

/**
 * Adjusts a day's accessory list for the current phase. Pure — returns new
 * objects and never mutates the input, so callers can keep passing the raw
 * template to edit/save flows. Barbell variations are identified by
 * membership in BARBELL_VARIATION_LIFTS; if a peaking filter would empty an
 * all-barbell template, light general-support work fills in instead.
 */
export function applyPhaseToAccessories(
  exercises: Exercise[],
  phase: WavePhase | undefined,
  liftType: string
): { exercises: Exercise[]; note: string } {
  const plan = phase ? ACCESSORY_PHASE_PLAN[phase] : undefined;
  if (!plan) return { exercises, note: '' };

  let result = exercises;
  if (plan.dropBarbellVariations) {
    result = result.filter(ex => !(ex.name in BARBELL_VARIATION_LIFTS));
    if (result.length === 0) {
      const fallbackNames = (generalSupportExercises[liftType] ?? []).slice(0, 3);
      result = fallbackNames.map(
        name => findExerciseDef(name) ?? { name, reps: '8-12', sets: 3, isBodyweight: false }
      );
    }
  }
  if (plan.maxExercises != null) {
    result = result.slice(0, plan.maxExercises);
  }

  const adjusted = result.map(ex => ({
    ...ex,
    sets: plan.setsOverride ?? (plan.setsDelta != null ? ex.sets + plan.setsDelta : ex.sets),
  }));

  return { exercises: adjusted, note: plan.note };
}

// Cross-day weak-point targeting (see vault: Program Logic — Juggernaut,
// "Cross-day Accessory Assignment"). Each day trains the weak points of the
// *opposite* lift: heavy variations never stack on top of that lift's own
// main sets, and each lift gets a second weekly exposure. `profileLift` is
// which lift's weak points to read from the profile; `mapKey` is which entry
// of weakPointExercisesMap to draw exercises from. Bench day is general
// support only — upper day carries the bench weak-point work.
export const ACCESSORY_WEAK_POINT_SOURCE: Record<string, { profileLift: 'squat' | 'bench' | 'deadlift'; mapKey: string } | null> = {
  squat:    { profileLift: 'deadlift', mapKey: 'deadlift' },
  deadlift: { profileLift: 'squat',    mapKey: 'squat' },
  upper:    { profileLift: 'bench',    mapKey: 'upper' },
  bench:    null,
};

/**
 * Resolves a day's accessory list: saved template wins, else weak-point
 * auto-selection, else the day's defaults. Shared by useWorkoutTemplate
 * (resolving the CURRENT day) and the weekly-volume credit calculation
 * (resolving every OTHER day) so the two never drift apart.
 */
export function resolveDayExercises(
  liftType: string,
  savedTemplate: Exercise[] | null | undefined,
  weakPoints: StickingPoint[] | undefined,
  defaultExercises: Exercise[]
): Exercise[] {
  if (savedTemplate) return savedTemplate;
  if (weakPoints && weakPoints.length > 0) {
    const selectedNames = selectMixedAccessories(liftType, weakPoints);
    // Weak-point picks (e.g. "Pause Squats") live in the full accessory
    // pool, not necessarily the 4-item baseExercises set for this day.
    return selectedNames
      .map(name => defaultExercises.find(e => e.name === name)
        ?? additionalExercises.find(e => e.name === name)
        ?? { name, reps: '8-12', sets: 3, isBodyweight: false })
      .slice(0, 4);
  }
  return defaultExercises;
}

export interface VariationContribution {
  /** Which day's template the variation set(s) were found on. */
  dayLiftType: string;
  exerciseName: string;
  sets: number;
}

/**
 * Plain-English explanation when a main-lift day's prescription shrinks
 * because barbell variations of that lift are already planned elsewhere in
 * the week — the transparency principle applied to weekly-volume
 * redistribution. Returns null when there's nothing to explain.
 */
export function formatVariationCreditNote(
  numSets: number,
  reducedBy: number,
  contributions: VariationContribution[]
): string | null {
  if (reducedBy <= 0 || contributions.length === 0) return null;
  const parts = [...new Set(
    contributions.map(c => `${c.exerciseName} on ${liftNamesShort[c.dayLiftType] ?? c.dayLiftType} day`)
  )];
  const list = parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
    : parts[0];
  const setsWord = numSets === 1 ? 'set' : 'sets';
  const coverWord = parts.length > 1 ? 'cover' : 'covers';
  return `${numSets} ${setsWord} today — ${list} ${coverWord} the rest of this week's volume.`;
}

export function selectMixedAccessories(
  liftType: string,
  weakPoints: StickingPoint[] | undefined,
  excludeExercises: string[] = []
): string[] {
  // weakPoints are the sticking points of the day's *target* lift (see
  // ACCESSORY_WEAK_POINT_SOURCE) — callers read them via `profileLift`.
  const source = ACCESSORY_WEAK_POINT_SOURCE[liftType] ?? null;
  const allExercises = source ? weakPointExercisesMap[source.mapKey] : undefined;
  const generalExercises = generalSupportExercises[liftType];

  if (!generalExercises) return [];

  const selected: string[] = [];
  const availableWeak = new Set<string>();
  const availableGeneral = generalExercises.filter(e => !excludeExercises.includes(e));

  if (allExercises && weakPoints && weakPoints.length > 0) {
    weakPoints.forEach(point => {
      allExercises[point].forEach(ex => {
        if (!excludeExercises.includes(ex)) availableWeak.add(ex);
      });
    });
  }

  // Up to 2 weak-point slots, but at most 1 heavy barbell variation — a
  // second variation of the same lift adds axial fatigue without much new
  // stimulus, so the other slot prefers a non-barbell movement from the
  // same sticking-point list.
  const numWeakPointExercises = Math.min(2, availableWeak.size);
  let barbellCount = 0;
  for (const ex of availableWeak) {
    if (selected.length >= numWeakPointExercises) break;
    const isBarbell = ex in BARBELL_VARIATION_LIFTS;
    if (isBarbell && barbellCount >= 1) continue;
    selected.push(ex);
    if (isBarbell) barbellCount++;
  }

  for (const ex of availableGeneral) {
    if (selected.length >= 4) break;
    if (!selected.includes(ex)) selected.push(ex);
  }

  return selected;
}
