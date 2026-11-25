import { listPrograms, getProgram, DEFAULT_DAYS_PER_WEEK } from '../../lib/programs/registry';
import type { DaysPerWeek, ProgramId } from '../../lib/programs/types';

interface ProgramPickerProps {
  programId: ProgramId;
  daysPerWeek: DaysPerWeek;
  onChange: (next: { programId: ProgramId; daysPerWeek: DaysPerWeek }) => void;
  /** Keeps ids unique when more than one picker is on a page. */
  idPrefix?: string;
}

const optionClass = (selected: boolean) =>
  `px-3 py-2 rounded-lg transition-all text-left ${
    selected
      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`;

/**
 * Program and days-per-week choice, shared by onboarding and Profile. Options
 * come from the registry, so a new program or layout shows up here with no
 * edits. Picking a program that doesn't support the current days moves to a
 * day count it does.
 */
export default function ProgramPicker({ programId, daysPerWeek, onChange, idPrefix = 'program' }: ProgramPickerProps) {
  const programs = listPrograms();
  const current = getProgram(programId);

  const choose = (nextId: ProgramId) => {
    const next = getProgram(nextId);
    const days = next.supportedDays.includes(daysPerWeek)
      ? daysPerWeek
      : next.supportedDays.includes(DEFAULT_DAYS_PER_WEEK) ? DEFAULT_DAYS_PER_WEEK : next.supportedDays[0];
    onChange({ programId: nextId, daysPerWeek: days });
  };

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-labelledby={`${idPrefix}-days-label`}>
        <h3 id={`${idPrefix}-days-label`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Days per week
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {current.supportedDays.map(days => {
            const selected = daysPerWeek === days;
            const lifts = current.layout(days).days.map(d => d.label.toLowerCase()).join(', ');
            return (
              <button
                key={days}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ programId, daysPerWeek: days })}
                className={optionClass(selected)}
              >
                <span className="block text-sm font-medium">{days} days</span>
                <span className="block text-xs font-normal opacity-70 mt-0.5">{lifts}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="radiogroup" aria-labelledby={`${idPrefix}-program-label`}>
        <h3 id={`${idPrefix}-program-label`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Program
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {programs.map(program => {
            const selected = program.id === programId;
            return (
              <button
                key={program.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(program.id)}
                className={optionClass(selected)}
              >
                <span className="block text-sm font-medium">{program.name}</span>
                <span className="block text-xs font-normal opacity-70 mt-0.5">{program.summary}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
