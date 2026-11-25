import { DEFAULT_PROGRAM_ID } from './registry';
import type { ProgramId } from './types';

/**
 * Program fields stamped on every logged session. day_id equals lift_type
 * until the day-layout step introduces layouts whose days differ from lifts.
 */
export function sessionProgramFields(
  profile: { program_id?: ProgramId | null } | null | undefined,
  liftType: string
): { program_id: ProgramId; day_id: string } {
  return { program_id: profile?.program_id ?? DEFAULT_PROGRAM_ID, day_id: liftType };
}
