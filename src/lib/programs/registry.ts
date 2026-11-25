import { juggernaut } from './juggernaut';
import type { DayLayout, DaysPerWeek, ProgramDefinition, ProgramId } from './types';

export const DEFAULT_PROGRAM_ID: ProgramId = 'juggernaut';
export const DEFAULT_DAYS_PER_WEEK: DaysPerWeek = 4;

// To add a program: implement ProgramDefinition, extend ProgramId, add it here.
const PROGRAMS: Record<ProgramId, ProgramDefinition> = {
  juggernaut,
};

/**
 * Returns the program for an id. An unknown or missing id (an old client, a
 * bad row) falls back to the default and warns; it never throws in the UI.
 */
export function getProgram(id: string | null | undefined): ProgramDefinition {
  const program = id ? PROGRAMS[id as ProgramId] : undefined;
  if (program) return program;
  if (id) console.warn(`Unknown program id "${id}", falling back to ${DEFAULT_PROGRAM_ID}`);
  return PROGRAMS[DEFAULT_PROGRAM_ID];
}

/** All programs, for onboarding and Profile pickers. */
export function listPrograms(): ProgramDefinition[] {
  return Object.values(PROGRAMS);
}

/**
 * The day layout for a user's program and days per week. An unsupported or
 * missing days value falls back to the program's default so the UI always has
 * days to render.
 */
export function getLayout(programId: string | null | undefined, days: number | null | undefined): DayLayout {
  const program = getProgram(programId);
  const supported = program.supportedDays.includes(days as DaysPerWeek);
  return program.layout(supported ? (days as DaysPerWeek) : program.supportedDays.includes(DEFAULT_DAYS_PER_WEEK) ? DEFAULT_DAYS_PER_WEEK : program.supportedDays[0]);
}

export function isSupported(id: ProgramId, days: DaysPerWeek): boolean {
  return PROGRAMS[id]?.supportedDays.includes(days) ?? false;
}
