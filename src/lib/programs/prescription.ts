import type { JuggernautSetsConfig } from '../types';
import type { Prescription } from './types';

/**
 * Flattens a prescription into the shape the workout page builds its main sets
 * from: the top group (sets x reps, AMRAP flag) plus the first back-off group
 * as "down sets" after it. Null when the prescription has no top group.
 */
export function toSetsConfig(prescription: Prescription): JuggernautSetsConfig | null {
  const top = prescription.groups.find(g => g.kind === 'top');
  if (!top) return null;
  const back = prescription.groups.find(g => g.kind === 'backoff');
  return {
    numSets: top.sets,
    reps: top.reps,
    weight: top.weight,
    isAmap: top.isAmrap,
    ...(back ? { downSets: { weight: back.weight, sets: back.sets, reps: back.reps } } : {}),
  };
}
