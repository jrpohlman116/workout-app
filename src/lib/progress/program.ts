import { fixedIncrement } from '../programs/fiveThreeOne/engine';
import type { LiftId, ProgramDefinition, ProgramState, Unit, WeekBlock } from '../programs/types';
import type { TrainingMaxChange } from '../supabase';

// Data for the Progress → Program tab and the training max sheet (proposal
// #11). Pure: the tab renders these.

export interface WaveRow {
  phase: WeekBlock['phase'];
  label: string;
  /** "5 @ 75%", "AMRAP @ 90%" */
  scheme: string;
  /** "180 × 5", "215 × 3+" */
  top: string;
  /** "Back-offs 160 × 5" */
  backoff: string | null;
  state: 'done' | 'current' | 'upcoming';
}

const pct = (p?: number) => (p == null ? '' : ` @ ${Math.round(p * 1000) / 10}%`);

/** The four weeks of the wave a block belongs to, with this lift's loads. */
export function waveRows(args: {
  program: ProgramDefinition;
  weeks: WeekBlock[];
  current: WeekBlock;
  lift: LiftId;
  trainingMax: number;
  unit: Unit;
  plates?: readonly number[];
  state?: ProgramState;
}): WaveRow[] {
  const { program, weeks, current, lift, trainingMax, unit, plates, state } = args;
  const wave = weeks.filter(w => w.cycleIndex === current.cycleIndex && w.phase !== 'peaking' && w.phase !== 'meet_week');
  const currentPos = wave.findIndex(w => w.weekIndex === current.weekIndex);
  return wave.map((block, i) => {
    const groups = program.prescribe({ block, lift, trainingMax, unit, plates, state }).groups;
    const top = groups.find(g => g.kind === 'top');
    const back = groups.find(g => g.kind === 'backoff');
    return {
      phase: block.phase,
      label: program.weekLabel(block),
      scheme: top ? `${top.isAmrap ? 'AMRAP' : `${top.sets > 1 ? `${top.sets} × ` : ''}${top.reps}`}${pct(top.pct)}` : '',
      top: top ? `${top.weight} × ${top.reps}${top.isAmrap ? '+' : ''}` : '—',
      backoff: back ? `Back-offs ${back.weight} × ${back.reps}` : null,
      state: currentPos < 0 ? 'upcoming' : i < currentPos ? 'done' : i === currentPos ? 'current' : 'upcoming',
    };
  });
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthOf = (iso: string) => MONTH[new Date(iso).getMonth()];

/** One line on what a change was: "+10 · fixed increment", "Start", "Held". */
export function changeLabel(c: TrainingMaxChange, lift: LiftId, unit: Unit): string {
  const delta = c.old_tm != null ? Math.round((c.new_tm - c.old_tm) * 100) / 100 : 0;
  const signed = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)}`;
  switch (c.reason) {
    case 'start': return 'Starting training max';
    case 'hold': return 'Held · missed the AMRAP minimum';
    case 'decrease': return `${signed} · dropped 5%`;
    case 'manual': return `${signed} · edited`;
    case 'reset': return `${signed} · reset`;
    case 'increase':
      return delta === fixedIncrement(lift, unit) ? `${signed} · fixed increment` : `${signed} · from your AMRAP`;
  }
}

export interface TmSummary {
  current: number;
  startedAt: { value: number; month: string } | null;
  /** "+30 lb over 3 waves" */
  changeSinceStart: string | null;
  /** "+10 lb · after 205 × 5 AMRAP" */
  lastChange: string | null;
  /** Newest first. */
  history: { title: string; detail: string }[];
}

export function tmSummary(rows: TrainingMaxChange[], current: number, lift: LiftId, unit: Unit): TmSummary {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const first = sorted[0];
  const waves = sorted.filter(r => r.reason !== 'start' && r.reason !== 'manual').length;
  const last = [...sorted].reverse().find(r => r.reason !== 'start');
  const since = first ? Math.round((current - first.new_tm) * 100) / 100 : 0;
  const lastDelta = last && last.old_tm != null ? Math.round((last.new_tm - last.old_tm) * 100) / 100 : 0;
  return {
    current,
    startedAt: first ? { value: first.new_tm, month: monthOf(first.created_at) } : null,
    changeSinceStart: first
      ? `${since > 0 ? '+' : since < 0 ? '−' : ''}${Math.abs(since)} ${unit}${waves ? ` over ${waves} ${waves === 1 ? 'wave' : 'waves'}` : ''}`
      : null,
    lastChange: last
      ? `${lastDelta > 0 ? '+' : lastDelta < 0 ? '−' : ''}${Math.abs(lastDelta)} ${unit}${last.amrap_weight ? ` · after ${last.amrap_weight} × ${last.amrap_reps} AMRAP` : ''}`
      : null,
    history: [...sorted].reverse().map(r => ({ title: `${monthOf(r.created_at)} · ${r.new_tm} ${unit}`, detail: changeLabel(r, lift, unit) })),
  };
}

/** Bars for the history chart, oldest first, plus the dashed next-wave bar. */
export function tmBars(rows: TrainingMaxChange[], next: number | null): { label: string; value: number; next?: boolean }[] {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-5);
  const bars: { label: string; value: number; next?: boolean }[] = sorted.map(r => ({ label: monthOf(r.created_at), value: r.new_tm }));
  if (next != null) bars.push({ label: 'Next', value: next, next: true });
  return bars;
}
