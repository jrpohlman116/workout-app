import type { StickingPoint, WeakPoints } from '../../lib/supabase';

export const STICKING_POINT_LABELS: Record<StickingPoint, string> = {
  in_the_hole: 'In the Hole',
  mid_range: 'Mid Range',
  lockout: 'Lockout',
};
export const STICKING_POINT_DESCRIPTIONS: Record<StickingPoint, string> = {
  in_the_hole: 'Bottom position',
  mid_range: 'Halfway up',
  lockout: 'Final inches',
};
const BOTTOM_POSITION_LABELS: Record<string, { label: string; description: string }> = {
  squat: { label: 'In the Hole', description: 'Bottom position' },
  bench: { label: 'Off the Chest', description: 'Bottom position' },
  deadlift: { label: 'Off the Ground', description: 'Breaking the floor' },
};
const STICKING_POINTS: StickingPoint[] = ['in_the_hole', 'mid_range', 'lockout'];

// This picker only covers sticking points for the three barbell lifts —
// `upper` (accessory/upper-body day) has no sticking-point concept in this UI.
export type MainLiftKey = 'squat' | 'bench' | 'deadlift';
export const LIFT_LABELS: Record<MainLiftKey, string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
};

interface WeakPointPickerProps {
  value: WeakPoints;
  onToggle: (lift: MainLiftKey, point: StickingPoint) => void;
}

/** Shared squat/bench/deadlift × sticking-point toggle grid — used by Profile's Training tab and the wave-boundary check-in prompt. */
export default function WeakPointPicker({ value, onToggle }: WeakPointPickerProps) {
  return (
    <div className="space-y-4">
      {(Object.keys(LIFT_LABELS) as MainLiftKey[]).map(lift => (
        <div key={lift}>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{LIFT_LABELS[lift]}</p>
          <div className="flex gap-2 flex-wrap">
            {STICKING_POINTS.map(point => {
              const selected = value[lift].includes(point);
              return (
                <button
                  key={point}
                  type="button"
                  onClick={() => onToggle(lift, point)}
                  className={`px-3 py-2 rounded-lg transition-all text-left ${
                    selected
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {point === 'in_the_hole' ? BOTTOM_POSITION_LABELS[lift].label : STICKING_POINT_LABELS[point]}
                  </span>
                  <span className="block text-xs font-normal opacity-60 mt-0.5">
                    {point === 'in_the_hole' ? BOTTOM_POSITION_LABELS[lift].description : STICKING_POINT_DESCRIPTIONS[point]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
