import { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProgramContext } from '../../hooks/useProgramContext';
import { supabase, type TrainingMaxChange } from '../../lib/supabase';
import { trainingMaxFor } from '../../lib/programs/maxes';
import { fixedIncrement } from '../../lib/programs/fiveThreeOne/engine';
import { availablePlates } from '../../lib/plates';
import { liftNames } from '../../lib/exercises';
import { tmBars, tmSummary, waveRows } from '../../lib/progress/program';
import type { LiftId, Unit, WeekBlock } from '../../lib/programs/types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import RadioCards from '../../components/ui/RadioCards';
import AccessibleModal from '../../components/accessible/AccessibleModal';

interface ProgramTabProps {
  lift?: string;
  openSheet?: boolean;
  onSelectLift: (lift: LiftId) => void;
  onSheetChange: (open: boolean) => void;
  onEditTrainingMax: (lift: LiftId) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Progress → Program (proposal #11): this wave, training max history, next wave. */
export default function ProgramTab({ lift: requested, openSheet, onSelectLift, onSheetChange, onEditTrainingMax }: ProgramTabProps) {
  const { user, profile } = useAuth();
  const programCtx = useProgramContext();
  const [history, setHistory] = useState<TrainingMaxChange[]>([]);

  const lifts = (programCtx?.layout.days ?? [])
    .map(d => d.primary)
    .filter((l): l is LiftId => !!l && !!profile && trainingMaxFor(profile, l) > 0);
  const lift = (lifts.includes(requested as LiftId) ? requested : lifts[0]) as LiftId | undefined;

  useEffect(() => {
    if (!user || !lift) return;
    let cancelled = false;
    supabase
      .from('training_max_changes')
      .select('*')
      .eq('user_id', user.id)
      .eq('lift', lift)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (!cancelled) setHistory((data ?? []) as TrainingMaxChange[]); });
    return () => { cancelled = true; };
  }, [user, lift, profile?.squat_max, profile?.bench_max, profile?.deadlift_max, profile?.ohp_max]);

  if (!profile || !programCtx || !lift) {
    return <Card className="p-5"><p className="text-sm text-gray-600 dark:text-gray-300">Set a training max to see your program.</p></Card>;
  }

  const { program, schedule, currentBlock } = programCtx;
  const unit = (profile.unit_preference || 'lb') as Unit;
  const plates = availablePlates(profile);
  const tm = trainingMaxFor(profile, lift);
  const name = liftNames[lift] ?? lift;
  const isFiveThreeOne = program.id === 'five_three_one';
  const nextTm = isFiveThreeOne ? tm + fixedIncrement(lift, unit) : null;

  const rows = currentBlock ? waveRows({ program, weeks: schedule.weeks, current: currentBlock, lift, trainingMax: tm, unit, plates, state: profile.program_state }) : [];
  const currentPos = rows.findIndex(r => r.state === 'current');
  const summary = tmSummary(history, tm, lift, unit);
  const bars = tmBars(history, nextTm);
  const maxBar = Math.max(1, ...bars.map(b => b.value));

  // Next check: the realization week of this wave, or the next one if it's past.
  const realization = currentBlock
    ? schedule.weeks.find(w => w.phase === 'realization' && (w.cycleIndex ?? 0) >= (currentBlock.cycleIndex ?? 0) && w.weekIndex >= currentBlock.weekIndex)
    : undefined;
  const preview = isFiveThreeOne && nextTm != null && currentBlock
    ? (['accumulation', 'intensification', 'realization'] as const).map((phase, i) => {
        const block: WeekBlock = { ...currentBlock, phase };
        const top = program.prescribe({ block, lift, trainingMax: nextTm, unit, plates }).groups.find(g => g.kind === 'top');
        return { label: i === 2 ? 'Week 3 AMRAP' : `Week ${i + 1} top set`, value: top ? `${top.weight} × ${top.reps}${top.isAmrap ? '+' : ''} ${unit}` : '—' };
      })
    : null;

  return (
    <div className="space-y-4">
      <RadioCards<LiftId>
        layout="segmented"
        ariaLabel="Lift"
        value={lift}
        onSelect={onSelectLift}
        options={lifts.map(l => ({ value: l, title: liftNames[l] ?? l }))}
      />

      {currentBlock && rows.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {program.waveLabel(currentBlock) ?? 'This block'} · training max {tm} {unit}
            </p>
            {currentPos >= 0 && (
              <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-200">
                Week {currentPos + 1} of {rows.length}
              </span>
            )}
          </div>
          <h2 className="text-h3 text-gray-900 dark:text-gray-100">This wave</h2>
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.phase + i} className={`flex items-center gap-3 rounded-xl p-3 ${r.state === 'done' ? 'bg-green-50 dark:bg-green-900/20' : r.state === 'current' ? 'ring-2 ring-gray-900 dark:ring-gray-100' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${r.state === 'done' ? 'bg-green-800 text-white' : r.state === 'current' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-500 dark:bg-gray-800'}`}>
                  {r.state === 'done' ? <Check className="h-4 w-4" aria-label="Done" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{r.label}{r.state === 'current' ? <span className="sr-only"> (this week)</span> : null}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{r.scheme}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{r.top} {unit}</span>
                  {r.backoff && <span className="block text-xs text-gray-500 dark:text-gray-400">{r.backoff}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-gray-900 dark:text-gray-100">Training max history</h2>
          <button type="button" onClick={() => onSheetChange(true)} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Details <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {bars.length > 0 ? (
          <>
            <div className="flex items-end gap-3 h-40" aria-hidden="true">
              {bars.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end h-full gap-1">
                  <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">{b.value}</span>
                  <div
                    className={`w-full rounded-lg ${b.next ? 'border-2 border-dashed border-gray-300 dark:border-gray-500' : i === bars.length - (nextTm != null ? 2 : 1) ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-100 dark:bg-gray-700'}`}
                    style={{ height: `${Math.max(12, (b.value / maxBar) * 100)}%` }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{b.label}</span>
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>{name} training max by wave</caption>
              <thead><tr><th scope="col">When</th><th scope="col">Training max ({unit})</th></tr></thead>
              <tbody>{bars.map((b, i) => <tr key={i}><td>{b.next ? 'Next wave, if you hit the minimum' : b.label}</td><td>{b.value}</td></tr>)}</tbody>
            </table>
            {nextTm != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Each bar is one change. The dashed bar is next wave if you hit 3+ reps on the week 3 AMRAP.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">No history yet. It starts with your next wave.</p>
        )}
      </Card>

      {preview && (
        <Card className="p-5 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Next wave preview · training max {nextTm} {unit}</p>
          <dl className="space-y-1 text-sm">
            {preview.map(p => (
              <div key={p.label} className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-300">{p.label}</dt>
                <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{p.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Preview assumes the fixed +{fixedIncrement(lift, unit)} {unit}. A bigger AMRAP can raise it further, up to +5%.
          </p>
        </Card>
      )}

      <AccessibleModal isOpen={!!openSheet} onClose={() => onSheetChange(false)} title={`${name} training max`} sheet>
        <div className="space-y-4">
          <p><span className="text-5xl font-black tabular-nums text-gray-900 dark:text-gray-100">{tm}</span> <span className="text-2xl font-semibold text-gray-400">{unit}</span></p>
          <dl className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4 space-y-3 text-sm">
            {summary.startedAt && <SheetRow label="Started at" value={`${summary.startedAt.value} ${unit} · ${summary.startedAt.month}`} />}
            {summary.changeSinceStart && <SheetRow label="Change since start" value={summary.changeSinceStart} />}
            {summary.lastChange && <SheetRow label="Last change" value={summary.lastChange} />}
            {realization && <SheetRow label="Next check" value={`Week 3 AMRAP · ${shortDate(new Date(Math.max(realization.startDate.getTime(), Date.now() - DAY_MS)))}`} />}
          </dl>
          {summary.history.length > 0 && (
            <div>
              <h3 className="text-h4 text-gray-900 dark:text-gray-100 mb-2">History</h3>
              <ul className="space-y-2">
                {summary.history.map((h, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{h.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{h.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button fullWidth variant="tertiary" onClick={() => onEditTrainingMax(lift)}>Edit training max</Button>
        </div>
      </AccessibleModal>
    </div>
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
      <dd className="font-semibold text-gray-900 dark:text-gray-100 text-right">{value}</dd>
    </div>
  );
}
