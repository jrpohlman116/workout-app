import { describe, it, expect } from 'vitest';
import {
  baseExercises,
  additionalExercises,
  weakPointExercisesMap,
  ACCESSORY_PCT_OF_TM,
  BARBELL_VARIATION_LIFTS,
  ACCESSORY_PHASE_PLAN,
  ACCESSORY_WEAK_POINT_SOURCE,
  applyPhaseToAccessories,
  generalSupportExercises,
  selectMixedAccessories,
  resolveDayExercises,
  formatVariationCreditNote,
} from '../../lib/exercises';
import type { StickingPoint } from '../../lib/supabase';
import type { Exercise } from '../../lib/types';

// Every name referenced by selection logic must resolve to a real catalog
// entry — unresolved names silently fall back to a generic 8-12×3 placeholder
// with no weight suggestion, which is exactly the bug class these guard against.
const catalogNames = new Set<string>([
  ...Object.values(baseExercises).flat().map(ex => ex.name),
  ...additionalExercises.map(ex => ex.name),
]);

describe('exercise catalog integrity', () => {
  it('resolves every weak-point exercise to a catalog entry', () => {
    for (const [lift, points] of Object.entries(weakPointExercisesMap)) {
      for (const [point, names] of Object.entries(points)) {
        for (const name of names) {
          expect(catalogNames.has(name), `${lift}/${point}: "${name}" missing from catalog`).toBe(true);
        }
      }
    }
  });

  it('resolves every %TM accessory to a catalog entry', () => {
    for (const name of Object.keys(ACCESSORY_PCT_OF_TM)) {
      expect(catalogNames.has(name), `ACCESSORY_PCT_OF_TM: "${name}" missing from catalog`).toBe(true);
    }
  });

  it('resolves every general-support exercise to a catalog entry', () => {
    for (const [lift, names] of Object.entries(generalSupportExercises)) {
      for (const name of names) {
        expect(catalogNames.has(name), `generalSupport/${lift}: "${name}" missing from catalog`).toBe(true);
      }
    }
  });
});

describe('selectMixedAccessories cross-day targeting', () => {
  const ALL_POINTS: StickingPoint[] = ['in_the_hole', 'mid_range', 'lockout'];

  it('squat day draws weak-point work from the deadlift map', () => {
    const selected = selectMixedAccessories('squat', ['lockout']);
    // Deadlift lockout list, capped at 1 barbell variation, filled with squat-day support
    expect(selected).toEqual(['Rack Pulls', 'Shrugs', 'Romanian Deadlift', 'Leg Curls']);
  });

  it('deadlift day draws weak-point work from the squat map', () => {
    const selected = selectMixedAccessories('deadlift', ['mid_range']);
    expect(selected).toEqual(['Pin Squats', 'Leg Press', 'Bulgarian Split Squats', 'Abs']);
  });

  it('squat and deadlift days never share an accessory, for any weak-point combo', () => {
    // Regression: identical general-support fill (RDL + Leg Curls on both
    // days) plus Leg Press in both weak-point maps made the two days nearly
    // identical for some users.
    for (const deadliftPoint of ALL_POINTS) {
      for (const squatPoint of ALL_POINTS) {
        const squatDay = selectMixedAccessories('squat', [deadliftPoint]);
        const deadliftDay = selectMixedAccessories('deadlift', [squatPoint]);
        const overlap = squatDay.filter(name => deadliftDay.includes(name));
        expect(overlap, `deadlift ${deadliftPoint} + squat ${squatPoint} → shared: ${overlap.join(', ')}`).toEqual([]);
      }
    }
  });

  it('bench day ignores weak points and returns general support only', () => {
    const selected = selectMixedAccessories('bench', ['lockout']);
    expect(selected).toEqual(['Barbell Curls', 'Face Pulls', 'Chest Flyes', 'Cable Flyes']);
    expect(ACCESSORY_WEAK_POINT_SOURCE.bench).toBeNull();
  });

  it('upper day carries the bench weak-point work', () => {
    const selected = selectMixedAccessories('upper', ['lockout']);
    expect(selected).toEqual(['Floor Press', 'Tricep Pressdowns', 'Face Pulls', 'Lateral Raise Complex']);
  });

  it('never selects the day\'s own lift variations as weak-point work', () => {
    // Squat day must not prescribe squat barbell variations, deadlift day no
    // deadlift variations — that was the same-day stacking bug. Checked via
    // BARBELL_VARIATION_LIFTS, not ACCESSORY_PCT_OF_TM — some barbell
    // variations deliberately have no weight suggestion yet but are still
    // barbell work of that lift's pattern.
    for (const point of ALL_POINTS) {
      for (const name of selectMixedAccessories('squat', [point])) {
        expect(BARBELL_VARIATION_LIFTS[name]).not.toBe('squat');
      }
      for (const name of selectMixedAccessories('deadlift', [point])) {
        expect(BARBELL_VARIATION_LIFTS[name]).not.toBe('deadlift');
      }
    }
  });

  it('caps weak-point picks at 1 barbell variation per day', () => {
    for (const liftType of ['squat', 'bench', 'deadlift', 'upper']) {
      // Every subset of sticking points, including all three at once
      const combos: StickingPoint[][] = [
        ...ALL_POINTS.map(p => [p]),
        ['in_the_hole', 'mid_range'],
        ALL_POINTS,
      ];
      for (const points of combos) {
        const selected = selectMixedAccessories(liftType, points);
        // BARBELL_VARIATION_LIFTS, not ACCESSORY_PCT_OF_TM — see above
        const barbellCount = selected.filter(name => name in BARBELL_VARIATION_LIFTS).length;
        expect(barbellCount, `${liftType} + ${points.join(',')}`).toBeLessThanOrEqual(1);
        expect(selected.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('treats the new no-%TM barbell variations as barbell for the cap and peaking filter', () => {
    // Force selection deep enough into bench.in_the_hole to reach the new
    // entries by excluding everything ahead of them in the list.
    const selected = selectMixedAccessories('upper', ['in_the_hole'], [
      'Incline DB Press', 'Board Press', 'Pin Press', 'Spoto Press', 'Pause Bench',
    ]);
    expect(selected[0]).toBe('3-Second Pause Bench');
    // The second weak-point slot must skip Feet-Up Bench (also barbell) and
    // land on Deep Stretch DB Bench (dumbbell, not barbell)
    expect(selected[1]).toBe('Deep Stretch DB Bench');
  });
});

describe('applyPhaseToAccessories', () => {
  const mixedDay: Exercise[] = [
    { name: 'Pause Squats', reps: '5-8', sets: 3, isBodyweight: false },
    { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
    { name: 'Barbell Rows', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Plank', reps: '30-60 sec', sets: 3, isBodyweight: true },
  ];

  it('adds one set per exercise in accumulation', () => {
    const { exercises, note } = applyPhaseToAccessories(mixedDay, 'accumulation', 'squat');
    expect(exercises).toHaveLength(4);
    exercises.forEach(ex => expect(ex.sets).toBe(4));
    expect(note).toBeTruthy();
  });

  it('leaves intensification and realization untouched', () => {
    for (const phase of ['intensification', 'realization'] as const) {
      const { exercises, note } = applyPhaseToAccessories(mixedDay, phase, 'squat');
      expect(exercises.map(ex => ex.sets)).toEqual([3, 3, 3, 3]);
      expect(note).toBe('');
    }
  });

  it('reduces to 2 sets on deload without dropping exercises', () => {
    const { exercises } = applyPhaseToAccessories(mixedDay, 'deload', 'squat');
    expect(exercises).toHaveLength(4);
    exercises.forEach(ex => expect(ex.sets).toBe(2));
  });

  it('drops barbell variations and caps at 3 light exercises during peaking', () => {
    const { exercises, note } = applyPhaseToAccessories(mixedDay, 'peaking', 'squat');
    expect(exercises.map(ex => ex.name)).toEqual(['Leg Curls', 'Barbell Rows', 'Plank']);
    exercises.forEach(ex => {
      expect(ex.sets).toBe(2);
      expect(ex.name in ACCESSORY_PCT_OF_TM).toBe(false);
    });
    expect(note).toBeTruthy();
  });

  it('falls back to general support when a peaking filter empties an all-barbell template', () => {
    const allBarbell: Exercise[] = [
      { name: 'Pause Squats', reps: '5-8', sets: 3, isBodyweight: false },
      { name: 'Front Squats', reps: '6-10', sets: 3, isBodyweight: false },
    ];
    const { exercises } = applyPhaseToAccessories(allBarbell, 'peaking', 'squat');
    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises.length).toBeLessThanOrEqual(3);
    exercises.forEach(ex => {
      expect(ex.name in ACCESSORY_PCT_OF_TM).toBe(false);
      expect(generalSupportExercises.squat).toContain(ex.name);
      expect(ex.sets).toBe(2);
    });
  });

  it('drops no-%TM barbell variations during peaking too, not just ones with a weight suggestion', () => {
    const day: Exercise[] = [
      { name: '3-Second Pause Bench', reps: '3-5', sets: 3, isBodyweight: false },
      { name: 'Feet-Up Bench', reps: '6-10', sets: 3, isBodyweight: false },
      { name: 'Deep Stretch DB Bench', reps: '8-12', sets: 3, isBodyweight: false },
      { name: 'Face Pulls', reps: '15-20', sets: 3, isBodyweight: false },
    ];
    const { exercises } = applyPhaseToAccessories(day, 'peaking', 'bench');
    const names = exercises.map(ex => ex.name);
    expect(names).not.toContain('3-Second Pause Bench');
    expect(names).not.toContain('Feet-Up Bench');
    // Dumbbell work isn't barbell fatigue — stays in during peaking
    expect(names).toContain('Deep Stretch DB Bench');
    expect(names).toContain('Face Pulls');
  });

  it('returns no accessories for meet week', () => {
    const { exercises } = applyPhaseToAccessories(mixedDay, 'meet_week', 'squat');
    expect(exercises).toEqual([]);
  });

  it('passes through unchanged when phase is undefined', () => {
    const { exercises, note } = applyPhaseToAccessories(mixedDay, undefined, 'squat');
    expect(exercises).toBe(mixedDay);
    expect(note).toBe('');
  });

  it('never mutates the input template', () => {
    const before = JSON.parse(JSON.stringify(mixedDay));
    applyPhaseToAccessories(mixedDay, 'accumulation', 'squat');
    applyPhaseToAccessories(mixedDay, 'peaking', 'squat');
    applyPhaseToAccessories(mixedDay, 'deload', 'squat');
    expect(mixedDay).toEqual(before);
  });

  it('defines a plan entry for every phase', () => {
    const phases = ['accumulation', 'intensification', 'realization', 'deload', 'peaking', 'meet_week'];
    phases.forEach(phase => expect(ACCESSORY_PHASE_PLAN[phase as keyof typeof ACCESSORY_PHASE_PLAN]).toBeDefined());
  });
});

describe('resolveDayExercises', () => {
  const defaults: Exercise[] = [
    { name: 'Romanian Deadlift', reps: '8-12', sets: 3, isBodyweight: false },
    { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
  ];

  it('prefers a saved template over everything else', () => {
    const saved: Exercise[] = [{ name: 'Custom Exercise', reps: '5', sets: 5, isBodyweight: false }];
    expect(resolveDayExercises('squat', saved, ['lockout'], defaults)).toBe(saved);
  });

  it('falls back to weak-point auto-selection when no template is saved', () => {
    const result = resolveDayExercises('deadlift', null, ['mid_range'], defaults);
    // Matches selectMixedAccessories('deadlift', ['mid_range']) resolved to real catalog entries
    expect(result[0].name).toBe('Pin Squats');
    expect(result.every(ex => ex.reps && ex.sets)).toBe(true);
  });

  it('falls back to the day defaults with no template and no weak points', () => {
    expect(resolveDayExercises('squat', null, undefined, defaults)).toBe(defaults);
    expect(resolveDayExercises('squat', undefined, [], defaults)).toBe(defaults);
  });
});

describe('formatVariationCreditNote', () => {
  it('returns null when nothing was reduced', () => {
    expect(formatVariationCreditNote(5, 0, [])).toBeNull();
  });

  it('names a single contributing exercise and day', () => {
    const note = formatVariationCreditNote(3, 2, [
      { dayLiftType: 'deadlift', exerciseName: 'Pin Squats', sets: 2 },
    ]);
    expect(note).toBe("3 sets today — Pin Squats on Deadlift day covers the rest of this week's volume.");
  });

  it('lists multiple contributions with an Oxford-less "and"', () => {
    const note = formatVariationCreditNote(3, 3, [
      { dayLiftType: 'deadlift', exerciseName: 'Pin Squats', sets: 2 },
      { dayLiftType: 'upper', exerciseName: 'Close-Grip Bench', sets: 1 },
    ]);
    expect(note).toBe(
      "3 sets today — Pin Squats on Deadlift day and Close-Grip Bench on Upper day cover the rest of this week's volume."
    );
  });

  it('deduplicates identical exercise+day pairs', () => {
    const note = formatVariationCreditNote(3, 2, [
      { dayLiftType: 'deadlift', exerciseName: 'Pin Squats', sets: 1 },
      { dayLiftType: 'deadlift', exerciseName: 'Pin Squats', sets: 1 },
    ]);
    expect(note).toBe("3 sets today — Pin Squats on Deadlift day covers the rest of this week's volume.");
  });

  it('uses singular "set" wording for a single remaining set', () => {
    const note = formatVariationCreditNote(1, 4, [
      { dayLiftType: 'deadlift', exerciseName: 'Pin Squats', sets: 4 },
    ]);
    expect(note).toMatch(/^1 set today/);
  });
});
