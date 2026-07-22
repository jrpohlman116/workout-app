import { calculatePlateBreakdown, formatPlateBreakdown } from '../../lib/calculations';

interface PlateVisualProps {
  targetWeight: number;
  barWeight: number;
  availablePlates: number[];
  unit: string;
}

// Plates render as rounded slabs scaled by weight relative to the heaviest
// available plate, so a 45 towers over a 2.5 the way it does on the floor.
const plateStyle = (weight: number, maxPlate: number) => {
  const ratio = Math.min(1, weight / maxPlate);
  return {
    height: `${Math.round(44 + ratio * 52)}px`,
    width: `${Math.round(26 + ratio * 14)}px`,
  };
};

const plateColor = (weight: number, maxPlate: number) => {
  if (weight >= maxPlate * 0.75) return 'bg-blue-600 dark:bg-blue-500 text-white';
  if (weight >= 10) return 'bg-blue-400 dark:bg-blue-700 text-white';
  return 'bg-gray-400 dark:bg-gray-500 text-white';
};

/**
 * Per-side plate loading as a picture instead of words. The whole graphic is
 * one labelled image for screen readers; individual slabs are decorative.
 */
export default function PlateVisual({ targetWeight, barWeight, availablePlates, unit }: PlateVisualProps) {
  const breakdown = calculatePlateBreakdown(targetWeight, barWeight, availablePlates);
  if (!breakdown) return null;

  const expanded = breakdown.plates.flatMap(p => Array(p.count).fill(p.weight) as number[]);
  const maxPlate = Math.max(...availablePlates);
  const addedTotal = Math.round((breakdown.loadedWeight - barWeight) * 100) / 100;

  const label = expanded.length > 0
    ? `Load per side: ${formatPlateBreakdown(breakdown)}. ${barWeight} ${unit} bar plus ${addedTotal} ${unit} in plates.`
    : `Empty bar — ${barWeight} ${unit}.`;

  return (
    <div role="img" aria-label={label} className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-1.5 min-h-[96px]" aria-hidden="true">
        {expanded.length > 0 ? (
          expanded.map((weight, idx) => (
            <div
              key={idx}
              style={plateStyle(weight, maxPlate)}
              className={`rounded-xl flex items-center justify-center text-xs font-bold tabular-nums select-none ${plateColor(weight, maxPlate)}`}
            >
              {weight}
            </div>
          ))
        ) : (
          <div className="h-2 w-40 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums" aria-hidden="true">
        {expanded.length > 0
          ? `${barWeight}${unit} bar + ${addedTotal}${unit}`
          : `Empty bar — ${barWeight}${unit}`}
      </p>
      {!breakdown.exact && (
        <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums" aria-hidden="true">
          nearest loadable: {breakdown.loadedWeight} {unit}
        </p>
      )}
    </div>
  );
}
