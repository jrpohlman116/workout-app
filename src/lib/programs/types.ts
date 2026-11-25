import type { WavePhase, WeekBlock, WaveSchedule } from '../types';

// Program-neutral contracts. See ITD - Multi-program architecture in the vault.
// Step 1 of the rollout covers the subset below; layouts (step 3) and the
// profile-backed state (step 2) are added later.

// Add a literal here (and a registry entry) to introduce a program.
export type ProgramId = 'juggernaut';

export type DaysPerWeek = 3 | 4;
export type LiftId = 'squat' | 'bench' | 'deadlift' | 'ohp';
export type Unit = 'lb' | 'kg';

// Stable id for a training day. A day is not a lift: 'upper' is an
// accessory-only day with no main lift. 'ohp' is reserved for the overhead
// press day that replaces it.
export type DayId = 'squat' | 'bench' | 'deadlift' | 'upper' | 'ohp';

export interface DayDef {
  dayId: DayId;
  /** "Squat", "Upper" */
  label: string;
  /** Lift with a top set and back-offs, or null for an accessory-only day. */
  primary: LiftId | null;
}

export interface DayLayout {
  daysPerWeek: DaysPerWeek;
  /** Training order within the week. */
  days: DayDef[];
}

// Step 1 reuses the existing week/schedule shapes so nothing downstream
// changes. Step 2 introduces index/cycleIndex/label (ITD section 1).
export type { WeekBlock, WaveSchedule as Schedule };

// Opaque to the app shell; each program narrows its own shape. Stored in
// user_profiles.program_state.
export type ProgramState = Record<string, unknown>;

export interface ScheduleInput {
  startDate: Date;
  /** Optional. Set: waves fit before the meet, then a peak block and meet week. */
  meetDate?: Date;
}

export interface PrescribeInput {
  block: WeekBlock;
  lift: LiftId;
  trainingMax: number;
  unit: Unit;
}

export interface SetGroup {
  kind: 'top' | 'backoff';
  /** Number of sets; for stopRule 'until-miss' this is the cap. */
  sets: number;
  reps: number;
  /** Already rounded to the unit's plate step. */
  weight: number;
  isAmrap: boolean;
  /** AMRAP minimum, for programs that define one. */
  minReps?: number;
  stopRule?: 'fixed' | 'until-miss';
  note?: string;
}

export interface Prescription {
  groups: SetGroup[];
}

export interface TmUpdateInput {
  lift: LiftId;
  currentTm: number;
  /** The block just completed. */
  block: WeekBlock;
  topSet: { weight: number; reps: number };
  unit: Unit;
}

export interface TmUpdate {
  newTm: number;
  reason: 'increase' | 'hold' | 'decrease';
  explanation: string;
}

export interface ProgramDefinition {
  id: ProgramId;
  name: string;
  /** One line for onboarding and Profile. */
  summary: string;
  supportedDays: DaysPerWeek[];

  /** Days for a supported days-per-week; throws for an unsupported value. */
  layout(days: DaysPerWeek): DayLayout;
  buildSchedule(input: ScheduleInput): WaveSchedule;
  /** Pure: same input, same output. All weights are already rounded. */
  prescribe(input: PrescribeInput): Prescription;
  /** Null outside the week that triggers a training max update. */
  updateTrainingMax(input: TmUpdateInput): TmUpdate | null;
  /** State a fresh run of the program starts with (written on restart). */
  initialState(): ProgramState;
  isWaveBoundary(leaving: WavePhase, entering: WavePhase | undefined): boolean;
}
