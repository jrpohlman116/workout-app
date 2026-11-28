import { useState, type Dispatch } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SetRow from '../../components/today/SetRow';
import RestCard from '../../components/today/RestCard';
import { EditSetSheet } from '../../components/today/Sheets';
import ExerciseSubstitutionModal from '../../components/features/ExerciseSubstitutionModal';
import { useAccessoryHistory } from '../../hooks/useAccessoryHistory';
import {
  accessoryStep, accessoryTarget, formatRange, nextTimeNote, parseRepRange, prefillSet, summarizeSets,
} from '../../lib/today/accessories';
import type { PlanAccessory } from '../../lib/today/plan';
import type { SessionAction, TodaySession } from '../../lib/today/session';
import type { Exercise } from '../../lib/types';
import { REST_TIMER_DEFAULTS } from '../../lib/constants';

interface AccessoriesStepProps {
  userId: string;
  eyebrow: string;
  unit: string;
  planned: PlanAccessory[];
  /** Bodyweight flags and the catalog, for swaps. */
  catalog: Exercise[];
  session: TodaySession;
  dispatch: Dispatch<SessionAction>;
  /** Why accessories were cut: 'time', 'readiness' or 'both'. */
  cutReason: 'time' | 'readiness' | 'both' | null;
  onFinish: () => void;
  /** Opens the "Cancel this session?" confirmation. */
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
}

type Edit = { index: number; setIndex: number; current: boolean };

/** Accessories (proposals #4 and #9): one card each, double progression, swaps for today. */
export default function AccessoriesStep({ userId, eyebrow, unit, planned, catalog, session, dispatch, cutReason, onFinish, onCancel, saving, error }: AccessoriesStepProps) {
  const [edit, setEdit] = useState<Edit | null>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const names = planned.map((a, i) => session.swaps[i] ?? a.name);
  const history = useAccessoryHistory(userId, names);
  const step = accessoryStep(unit);

  const items = planned.map((a, i) => {
    const name = names[i];
    const swapped = name !== a.name;
    const fromCatalog = catalog.find(e => e.name === name);
    const sets = swapped && fromCatalog ? fromCatalog.sets : a.sets;
    const repsText = swapped && fromCatalog ? fromCatalog.reps : a.reps;
    const range = parseRepRange(repsText);
    const last = history[name] ?? [];
    const target = accessoryTarget(last, range, sets, step);
    const logged = session.accessories[i] ?? [];
    const cut = a.cut && !session.restored.includes(i);
    const bodyweight = !!fromCatalog?.isBodyweight;
    return { i, name, priority: a.priority, sets, repsText, range, last, target, logged, cut, bodyweight, complete: logged.length >= sets };
  });
  const currentIndex = items.find(it => !it.cut && !it.complete)?.i ?? -1;
  const anyCut = items.some(it => it.cut);

  const editing = edit ? items[edit.index] : null;
  const editValue = editing && edit
    ? editing.logged[edit.setIndex] ?? prefillSet({ index: edit.setIndex, today: editing.logged, last: editing.last, target: editing.target, range: editing.range })
    : { weight: 0, reps: 0 };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-semibold text-gray-400 tracking-wide">{eyebrow}</p>
          <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 leading-tight">Accessories</h1>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {items.map(it => {
          const isCurrent = it.i === currentIndex;
          const chips = (
            <span className="flex items-center gap-2">
              {it.priority && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Priority</span>}
              {it.complete && <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">Done</span>}
              {it.cut && <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Cut today</span>}
              {!it.complete && !it.cut && (
                <button type="button" onClick={() => setSwapping(it.i)} className="min-h-[44px] px-1 text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`Swap ${it.name} for today`}>
                  Swap
                </button>
              )}
            </span>
          );
          const weightText = it.target.weight != null && !it.bodyweight ? ` · ${it.target.weight} ${unit}` : '';
          const lastText = it.last.length ? ` · last time ${summarizeSets(it.last, unit)}` : '';

          return (
            <Card key={it.i} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-h4 text-gray-900 dark:text-gray-100">{it.name}</h2>
                {chips}
              </div>

              {it.complete && (
                <>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{summarizeSets(it.logged, unit)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{nextTimeNote(it.logged, it.range, it.sets, step, unit)}</p>
                </>
              )}

              {it.cut && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{it.sets} × {formatRange(it.range, it.repsText)}{weightText}</p>
                  <button type="button" onClick={() => dispatch({ type: 'doAnyway', index: it.i })} className="min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    Do it anyway
                  </button>
                </>
              )}

              {!it.complete && !it.cut && !isCurrent && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{it.sets} × {formatRange(it.range, it.repsText)}{lastText || weightText}</p>
              )}

              {isCurrent && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{it.sets} × {formatRange(it.range, it.repsText)}{weightText}</p>
                  {it.target.movedUp && (
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-900 dark:text-green-200">
                      <p className="font-semibold">Up from {it.target.previousWeight} {unit}</p>
                      <p>You hit {it.range?.max} on every set last time, so the weight goes up and reps start back at {it.range?.min}.</p>
                    </div>
                  )}
                  {session.restEndsAt != null && it.logged.length > 0 && (
                    <RestCard
                      endsAt={session.restEndsAt}
                      totalSeconds={session.restTotal}
                      onExtend={() => dispatch({ type: 'extendRest', seconds: 30 })}
                      onSkip={() => dispatch({ type: 'skipRest' })}
                    />
                  )}
                  <ol className="space-y-2">
                    {Array.from({ length: it.sets }, (_, s) => {
                      const done = it.logged[s];
                      const next = s === it.logged.length;
                      const pre = done ?? prefillSet({ index: s, today: it.logged, last: it.last, target: it.target, range: it.range });
                      const setName = `${it.name} set ${s + 1}`;
                      if (done) {
                        return (
                          <li key={s}>
                            <SetRow number={s + 1} name={setName} weight={done.weight} reps={done.reps} unit={unit} state="done" plates={it.bodyweight ? 'Bodyweight' : undefined}
                              onEdit={() => setEdit({ index: it.i, setIndex: s, current: false })} />
                          </li>
                        );
                      }
                      return (
                        <li key={s}>
                          <SetRow
                            number={s + 1} name={setName} weight={pre.weight} reps={pre.reps} unit={unit}
                            plates={it.bodyweight ? 'Bodyweight' : undefined}
                            state={next ? 'current' : 'upcoming'}
                            onLog={next ? () => dispatch({ type: 'logAccessory', index: it.i, set: pre, now: Date.now(), restSeconds: REST_TIMER_DEFAULTS.accessory }) : undefined}
                            onEdit={next ? () => setEdit({ index: it.i, setIndex: s, current: true }) : undefined}
                          />
                        </li>
                      );
                    })}
                  </ol>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {it.logged.length ? 'Prefilled with your last set.' : it.last.length ? 'Prefilled from last time.' : 'Tap the numbers to set your weight.'} Different reps? Tap the numbers first.
                  </p>
                </>
              )}
            </Card>
          );
        })}

        {anyCut && cutReason && (
          <p className="rounded-2xl bg-white/90 dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
            {cutReason === 'time' ? `You picked ${session.time} minutes, so only the priority accessory stays.` : cutReason === 'readiness' ? 'A lighter day, so some accessories are cut.' : 'Time and readiness both limit today, so some accessories are cut.'}
            {' '}Cut accessories don't count against you; their weights carry over to next time.
          </p>
        )}

        {error && <p className="rounded-2xl bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-800 dark:text-red-200" role="alert">{error}</p>}
        <Button fullWidth size="lg" onClick={onFinish} disabled={saving}>{saving ? 'Saving…' : 'Finish session'}</Button>
        <Button fullWidth variant="tertiary" onClick={onCancel} disabled={saving}>Cancel session</Button>
      </div>

      {editing && edit && (
        <EditSetSheet
          open
          onClose={() => setEdit(null)}
          title={`${editing.name} · set ${edit.setIndex + 1}`}
          weight={editValue.weight}
          reps={editValue.reps}
          unit={unit}
          weightStep={step}
          repHint={editing.range ? `range ${formatRange(editing.range, editing.repsText)}` : editing.repsText}
          note={editing.range ? `Reps above the range count. Hit ${editing.range.max} on all ${editing.sets} sets and the weight goes up next time.` : undefined}
          onSave={set => (edit.current
            ? dispatch({ type: 'logAccessory', index: edit.index, set, now: Date.now(), restSeconds: REST_TIMER_DEFAULTS.accessory })
            : dispatch({ type: 'editAccessory', index: edit.index, setIndex: edit.setIndex, set }))}
        />
      )}
      {swapping != null && (
        <ExerciseSubstitutionModal
          isOpen
          onClose={() => setSwapping(null)}
          currentExercise={names[swapping]}
          availableExercises={catalog}
          variant="swap"
          onSubstitute={name => { dispatch({ type: 'swap', index: swapping, name }); setSwapping(null); }}
        />
      )}
    </div>
  );
}

