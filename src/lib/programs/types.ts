import type { WavePhase, WeekBlock, WaveSchedule } from '../types';

// Program-neutral contracts. See ITD - Multi-program architecture in the vault.
// Step 1 of the rollout covers the subset below; layouts (step 3) and the
// profile-backed state (step 2) are added later.

// Add a literal here (and a registry entry) to introduce a program.
export type ProgramId = 'juggernaut' | 'five_three_one';

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
  /**
   * Lifts whose weak-point-driven barbell variations this day carries. Set on a
   * layout that has no day of its own for them: in the 3-day layout the
   * deadlift day carries squat and bench variations. When unset the day uses
   * the program's default cross-day assignment.
   */
  variationSlots?: LiftId[];
  /**
   * Lifts that get back-off sets only on this day, at that week's back-off
   * load (5/3/1 3-day: bench on squat day, deadlift on bench day).
   */
  secondary?: LiftId[];
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
  /** The user's program_state; carries per-lift back-off load offsets. */
  state?: ProgramState;
  /** The lifter's plates. Loads round to what they can put on the bar. */
  plates?: readonly number[];
}

export type SetKind = 'top' | 'backoff' | 'secondary';

export interface SetGroup {
  kind: SetKind;
  /** For kind 'secondary': the lift these back-offs are for. */
  lift?: LiftId;
  /** Number of sets; for stopRule 'until-miss' this is the cap. */
  sets: number;
  reps: number;
  /** Already rounded to the unit's plate step. */
  weight: number;
  /** Share of the training max the weight came from, before rounding, when the program knows it. */
  pct?: number;
  isAmrap: boolean;
  /** AMRAP minimum, for programs that define one. */
  minReps?: number;
  stopRule?: 'fixed' | 'until-miss';
  note?: string;
}

export interface Prescription {
  groups: SetGroup[];
}

/** A logged session's main-lift sets, for rules that look back over a wave. */
export interface SessionSummary {
  phase: WavePhase;
  /**
   * In the order they were performed: top set first, then back-offs. `kind`
   * is set on sessions saved after it was introduced; without it, the first
   * set is the top set and the rest are back-offs.
   */
  mainSets: { weight: number; reps: number; kind?: SetKind }[];
  /** True when readiness or time lowered the back-off cap for this session. */
  backoffsCapped?: boolean;
}

export interface TmUpdateInput {
  lift: LiftId;
  currentTm: number;
  /** The block just completed. */
  block: WeekBlock;
  topSet: { weight: number; reps: number };
  /** This lift's sessions from the wave being closed, oldest first. */
  history?: SessionSummary[];
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
  /** Title for a week: "10-Rep Accumulation", "Peaking Week 2", "Realization". */
  weekLabel(block: WeekBlock): string;
  /** Name of the wave a week belongs to ("10-Rep Wave", "Wave 2"), when it has one. */
  waveLabel(block: WeekBlock): string | undefined;
  buildSchedule(input: ScheduleInput): WaveSchedule;
  /** Pure: same input, same output. All weights are already rounded. */
  prescribe(input: PrescribeInput): Prescription;
  /** Null outside the week that triggers a training max update. */
  updateTrainingMax(input: TmUpdateInput): TmUpdate | null;
  /** State a fresh run of the program starts with (written on restart). */
  initialState(): ProgramState;
  isWaveBoundary(leaving: WavePhase, entering: WavePhase | undefined): boolean;
}
