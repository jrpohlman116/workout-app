import RadioCards from '../ui/RadioCards';
import { listPrograms, getProgram, DEFAULT_DAYS_PER_WEEK } from '../../lib/programs/registry';
import type { DaysPerWeek, ProgramId } from '../../lib/programs/types';

interface ProgramPickerProps {
  programId: ProgramId;
  daysPerWeek: DaysPerWeek;
  onChange: (next: { programId: ProgramId; daysPerWeek: DaysPerWeek }) => void;
  /** Keeps ids unique when more than one picker is on a page. */
  idPrefix?: string;
}

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
      <div>
        <h3 id={`${idPrefix}-days-label`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Days per week
        </h3>
        <RadioCards<DaysPerWeek>
          labelId={`${idPrefix}-days-label`}
          value={daysPerWeek}
          onSelect={days => onChange({ programId, daysPerWeek: days })}
          options={current.supportedDays.map(days => ({
            value: days,
            title: `${days} days`,
            description: current.layout(days).days.map(d => d.label.toLowerCase()).join(', '),
          }))}
        />
      </div>

      <div>
        <h3 id={`${idPrefix}-program-label`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Program
        </h3>
        <RadioCards<ProgramId>
          labelId={`${idPrefix}-program-label`}
          value={programId}
          onSelect={choose}
          options={programs.map(program => ({ value: program.id, title: program.name, description: program.summary }))}
        />
      </div>
    </div>
  );
}
