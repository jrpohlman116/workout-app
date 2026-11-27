import { getProgram } from '../programs/registry';
import type { LiftId, SetKind } from '../programs/types';
import type { WavePhase } from '../types';
import type { ReadinessSession } from './types';

const LIFTS: LiftId[] = ['squat', 'bench', 'deadlift', 'ohp'];

/** The workout_sessions columns readiness reads. */
export interface ReadinessSessionRow {
  completed_at: string;
  lift_type: string;
  phase: WavePhase | null;
  wave: number | null;
  program_id: string | null;
  main_sets_data: { reps: string; weight: string; kind?: SetKind; checked?: boolean }[] | null;
  backoffs_capped?: boolean | null;
  backoff_cap?: number | null;
}

/** Local calendar date (YYYY-MM-DD) of a timestamp. */
export function localDate(value: Date | string = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A saved session as readiness sees it, or null when it can't say anything
 * (no main lift, no phase, no sets). Targets come from the session's own
 * program and week, so the same rules read 5/3/1 and Juggernaut sessions.
 * Sets saved unchecked weren't done and are left out.
 */
export function toReadinessSession(row: ReadinessSessionRow): ReadinessSession | null {
  const lift = row.lift_type as LiftId;
  if (!LIFTS.includes(lift) || !row.phase || !Array.isArray(row.main_sets_data)) return null;

  const program = getProgram(row.program_id ?? 'juggernaut');
  const block = {
    phase: row.phase, wave: (row.wave ?? undefined) as 10 | 8 | 5 | 3 | undefined,
    weekIndex: 0, startDate: new Date(0), endDate: new Date(0),
    // Peak weeks need a position; the first of three keeps their targets.
    peakWeek: 1, totalPeakWeeks: 3,
  };
  const groups = program.prescribe({ block, lift, trainingMax: 100, unit: 'lb' }).groups;
  const top = groups.find(g => g.kind === 'top');
  const back = groups.find(g => g.kind === 'backoff');
  if (!top) return null;

  const done = row.main_sets_data
    .filter(s => s.checked !== false && (s.reps || s.weight))
    .map((s, i) => ({ reps: parseInt(s.reps) || 0, kind: s.kind ?? (i === 0 ? 'top' : 'backoff') }));
  const topSets = done.filter(s => s.kind === 'top');
  if (topSets.length === 0) return null;

  return {
    date: localDate(row.completed_at),
    lift,
    // With several top sets (Juggernaut), the weakest one decides a miss.
    topReps: Math.min(...topSets.map(s => s.reps)),
    topTarget: top.minReps ?? top.reps,
    backoffReps: done.filter(s => s.kind === 'backoff').map(s => s.reps),
    backoffTarget: back?.reps ?? 0,
    backoffCap: row.backoff_cap ?? back?.sets ?? 0,
    capped: !!row.backoffs_capped,
  };
}
