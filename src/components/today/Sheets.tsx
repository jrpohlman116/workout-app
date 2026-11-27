import { useEffect, useState } from 'react';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import AccessibleModal from '../accessible/AccessibleModal';
import Button from '../ui/Button';
import type { ReadinessDay } from '../../lib/readiness/store';
import type { SessionLimits } from '../../lib/readiness/effects';
import { changesFor } from '../../lib/today/copy';
import type { WeightExplanation } from '../../lib/today/plan';

const STATE_WORD = { green: 'green', yellow: 'yellow', red: 'red' } as const;

export function ReadinessSheet({ open, onClose, readiness, limits }: {
  open: boolean;
  onClose: () => void;
  readiness: ReadinessDay;
  limits: SessionLimits;
}) {
  const { inputs } = readiness;
  return (
    <AccessibleModal isOpen={open} onClose={onClose} title={`Why today is ${STATE_WORD[readiness.state]}`} sheet>
      <div className="space-y-4">
        {inputs.signals.length > 0 ? (
          <ul className="space-y-2">
            {inputs.signals.map(s => (
              <li key={s.kind + s.lift} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {s.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 text-sm text-gray-900 dark:text-gray-100">{inputs.reason}</p>
        )}
        {inputs.note && <p className="text-sm text-gray-600 dark:text-gray-300">{inputs.note}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400">Based on your last sessions. Connect Oura or Strava for sleep, HRV and runs.</p>
        <div>
          <h3 className="text-h4 text-gray-900 dark:text-gray-100 mb-2">What changes today</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {changesFor(limits).map(line => <li key={line}>{line}</li>)}
          </ul>
        </div>
        <Button fullWidth onClick={onClose}>Got it</Button>
      </div>
    </AccessibleModal>
  );
}

export function WhyWeightSheet({ open, onClose, weight, unit, explanation, liftName, onOpenHistory }: {
  open: boolean;
  onClose: () => void;
  weight: number;
  unit: string;
  explanation: WeightExplanation;
  liftName: string;
  onOpenHistory?: () => void;
}) {
  return (
    <AccessibleModal isOpen={open} onClose={onClose} title={`Why ${weight} ${unit}?`} sheet>
      <div className="space-y-4">
        <dl className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4 space-y-3">
          {explanation.rows.map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-gray-600 dark:text-gray-300">{row.label}</dt>
              <dd className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        {onOpenHistory && (
          <button type="button" onClick={onOpenHistory} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {liftName} training max history <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Readiness can cut back-off sets and accessories. It never changes the weight on the bar.
        </p>
        <Button fullWidth onClick={onClose}>Got it</Button>
      </div>
    </AccessibleModal>
  );
}

function Stepper({ label, value, onChange, step, min, hint, unit }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  hint: string;
  unit?: string;
}) {
  const id = `stepper-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-600 dark:text-gray-300 mb-2">{label}</label>
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 p-2">
        <button type="button" onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} aria-label={`Decrease ${label.toLowerCase()}`} className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex-1 text-center">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={Number.isFinite(value) ? value : ''}
            onChange={e => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
            aria-describedby={`${id}-hint`}
            className="w-24 bg-transparent text-center text-3xl font-black tabular-nums text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          />
          <p id={`${id}-hint`} className="text-xs text-gray-500 dark:text-gray-400">{unit ? `${unit} · ` : ''}{hint}</p>
        </div>
        <button type="button" onClick={() => onChange(Math.round((value + step) * 100) / 100)} aria-label={`Increase ${label.toLowerCase()}`} className="flex h-12 w-12 items-center justify-center rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Edit any set's weight and reps before or after logging it (proposals #1, #9). */
export function EditSetSheet({ open, onClose, title, weight, reps, unit, weightStep, repHint, note, onSave }: {
  open: boolean;
  onClose: () => void;
  title: string;
  weight: number;
  reps: number;
  unit: string;
  weightStep: number;
  /** "target 3", "range 8–12" */
  repHint: string;
  note?: string;
  onSave: (set: { weight: number; reps: number }) => void;
}) {
  const [w, setW] = useState(weight);
  const [r, setR] = useState(reps);
  useEffect(() => { if (open) { setW(weight); setR(reps); } }, [open, weight, reps]);

  return (
    <AccessibleModal isOpen={open} onClose={onClose} title={title} sheet>
      <div className="space-y-4">
        <Stepper label="Weight" value={w} onChange={setW} step={weightStep} min={0} unit={unit} hint={`steps of ${weightStep}`} />
        <Stepper label="Reps" value={r} onChange={v => setR(Math.round(v))} step={1} min={0} hint={repHint} />
        {note && <p className="text-sm text-gray-600 dark:text-gray-300">{note}</p>}
        <Button fullWidth onClick={() => { onSave({ weight: w, reps: r }); onClose(); }}>Save set</Button>
        <Button fullWidth variant="tertiary" onClick={onClose}>Cancel</Button>
      </div>
    </AccessibleModal>
  );
}
