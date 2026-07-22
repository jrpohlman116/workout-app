import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutSummaryView from '../../pages/WorkoutDetail/views/WorkoutSummaryView';
import type { Exercise, JuggernautSetsConfig } from '../../lib/types';

const peakingConfig: JuggernautSetsConfig = {
  numSets: 1,
  reps: 1,
  weight: 290,
  isAmap: false,
  downSets: { weight: 255, sets: 2, reps: 2 },
};

const templateExercises: Exercise[] = [
  { name: 'Pause Squats', reps: '5-8', sets: 3, isBodyweight: false },
  { name: 'Leg Curls', reps: '12-15', sets: 3, isBodyweight: false },
];

const adjustedExercises: Exercise[] = [
  { name: 'Leg Curls', reps: '12-15', sets: 2, isBodyweight: false },
];

describe('WorkoutSummaryView peaking rendering', () => {
  it('renders the down-sets row when the main config has down sets', () => {
    render(
      <WorkoutSummaryView
        mainConfig={peakingConfig}
        exercises={adjustedExercises}
        editExercises={templateExercises}
        phase="peaking"
        onStartWorkout={() => {}}
      />
    );

    expect(screen.getByText(/Down Sets — 2 × 2/)).toBeInTheDocument();
    expect(screen.getByText('255')).toBeInTheDocument();
  });

  it('shows the phase note and the phase-adjusted accessory list', () => {
    render(
      <WorkoutSummaryView
        mainConfig={peakingConfig}
        exercises={adjustedExercises}
        editExercises={templateExercises}
        phaseNote="Peaking — heavy barbell variations are dropped."
        phase="peaking"
        onStartWorkout={() => {}}
      />
    );

    expect(screen.getByText(/heavy barbell variations are dropped/)).toBeInTheDocument();
    expect(screen.getByText('Leg Curls')).toBeInTheDocument();
    expect(screen.queryByText('Pause Squats')).not.toBeInTheDocument();
  });

  it('seeds edit mode from the raw template, not the phase-adjusted display list', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <WorkoutSummaryView
        mainConfig={peakingConfig}
        exercises={adjustedExercises}
        editExercises={templateExercises}
        phase="peaking"
        onStartWorkout={() => {}}
        onSaveExercises={onSave}
        onResetExercises={vi.fn().mockResolvedValue(true)}
      />
    );

    await user.click(screen.getByRole('button', { name: /edit accessory exercises/i }));

    // The filtered-out barbell variation must reappear in edit mode
    expect(screen.getByText('Pause Squats')).toBeInTheDocument();

    // Saving untouched edit state must persist the raw template
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(onSave).toHaveBeenCalledWith(templateExercises);
  });

  it('shows the main-sets reduction note under the sets card when provided', () => {
    render(
      <WorkoutSummaryView
        mainConfig={{ numSets: 3, reps: 10, weight: 180, isAmap: false }}
        exercises={adjustedExercises}
        editExercises={templateExercises}
        mainSetsNote="3 sets today — Pin Squats on Deadlift day covers the rest of this week's volume."
        phase="accumulation"
        onStartWorkout={() => {}}
      />
    );
    expect(screen.getByText(/Pin Squats on Deadlift day covers the rest/)).toBeInTheDocument();
  });

  it('renders no reduction note when none is provided', () => {
    render(
      <WorkoutSummaryView
        mainConfig={{ numSets: 5, reps: 10, weight: 180, isAmap: false }}
        exercises={adjustedExercises}
        editExercises={templateExercises}
        phase="accumulation"
        onStartWorkout={() => {}}
      />
    );
    expect(screen.queryByText(/covers the rest/)).not.toBeInTheDocument();
  });
});
