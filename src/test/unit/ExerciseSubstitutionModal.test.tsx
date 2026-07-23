import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ExerciseSubstitutionModal from '../../components/features/ExerciseSubstitutionModal';
import type { Exercise } from '../../lib/types';

// exercise_substitutions rows, settable per test. loadSubstitutions queries
// this table twice (original_exercise, then substitute_exercise) — the mock
// below routes each .eq() call to the matching half based on the column name.
let forwardRows: Record<string, unknown>[] = [];
let reverseRows: Record<string, unknown>[] = [];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((column: string) =>
        Promise.resolve({
          data: column === 'original_exercise' ? forwardRows : reverseRows,
          error: null,
        })
      ),
    })),
  },
}));

const availableExercises: Exercise[] = [
  { name: 'Board Press', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'Feet-Up Bench', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Pause Bench', reps: '3-5', sets: 3, isBodyweight: false },
  { name: 'Close-Grip Bench', reps: '6-10', sets: 3, isBodyweight: false },
  { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
];

describe('ExerciseSubstitutionModal', () => {
  beforeEach(() => {
    forwardRows = [];
    reverseRows = [];
  });

  it('shows weak-point-aligned substitutes for an exercise with no DB rows', async () => {
    render(
      <ExerciseSubstitutionModal
        isOpen={true}
        onClose={() => {}}
        currentExercise="Board Press"
        onSubstitute={() => {}}
        availableExercises={availableExercises}
      />
    );

    await waitFor(() => expect(screen.getByText(/Targets the Same Weak Point/)).toBeInTheDocument());
    expect(screen.getByText('Feet-Up Bench')).toBeInTheDocument();
    expect(screen.getByText('Pause Bench')).toBeInTheDocument();
    expect(screen.queryByText('No recommended substitutions available.')).not.toBeInTheDocument();
  });

  it('reads DB rows in both directions and inverts difficulty for the reverse side', async () => {
    // currentExercise ('Leg Curls') is the substitute in this row — reverse
    // lookup must surface Barbell Rows as a suggestion, flipping 'easier'
    // (Barbell Rows was tagged easier than Leg Curls) to 'harder'.
    reverseRows = [
      {
        id: '1',
        original_exercise: 'Barbell Rows',
        substitute_exercise: 'Leg Curls',
        description: 'desc',
        equipment_needed: 'Barbell',
        difficulty: 'easier',
        muscle_groups: ['Hamstrings'],
        created_at: '',
      },
    ];

    render(
      <ExerciseSubstitutionModal
        isOpen={true}
        onClose={() => {}}
        currentExercise="Leg Curls"
        onSubstitute={() => {}}
        availableExercises={availableExercises}
      />
    );

    await waitFor(() => expect(screen.getByText('Barbell Rows')).toBeInTheDocument());
    expect(screen.getByText('Harder')).toBeInTheDocument();
  });

  it('excludes a DB row that matches muscle group but not weak point, for a weak-point exercise', async () => {
    // Farmer Walks shares 'traps' with Rack Pulls but isn't part of the
    // weak-point system — same weak point AND same muscle group are both
    // required once the original exercise is a weak-point exercise. (Rack
    // Pulls' own weak-point-aligned matches — Pin Pulls, Partial Deadlifts,
    // Shrugs, B Stance RDLs — aren't in this test's availableExercises
    // fixture, so that section stays empty too.)
    forwardRows = [
      {
        id: '1',
        original_exercise: 'Rack Pulls',
        substitute_exercise: 'Farmer Walks',
        description: 'desc',
        equipment_needed: 'Barbell',
        difficulty: 'similar',
        muscle_groups: ['traps', 'forearms', 'core'],
        created_at: '',
      },
    ];

    render(
      <ExerciseSubstitutionModal
        isOpen={true}
        onClose={() => {}}
        currentExercise="Rack Pulls"
        onSubstitute={() => {}}
        availableExercises={availableExercises}
      />
    );

    await waitFor(() => expect(screen.getByText('No recommended substitutions available.')).toBeInTheDocument());
    expect(screen.queryByText('Farmer Walks')).not.toBeInTheDocument();
  });

  it('falls back to the empty state when neither weak-point nor DB substitutes exist', async () => {
    render(
      <ExerciseSubstitutionModal
        isOpen={true}
        onClose={() => {}}
        currentExercise="Leg Curls"
        onSubstitute={() => {}}
        availableExercises={availableExercises}
      />
    );

    await waitFor(() => expect(screen.getByText('No recommended substitutions available.')).toBeInTheDocument());
  });
});
