import AccessibleFormGroup from '../../../components/accessible/AccessibleFormGroup';
import { SetInput } from '../../../lib/types';

interface SupplementalLiftViewProps {
  liftName: string;
  variationType: 'bbb' | 'bbs';
  supplementalSets: SetInput[];
  unitPreference: string;
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  onNext: () => void;
  nextExerciseName: string | null;
}

export default function SupplementalLiftView({
  liftName,
  variationType,
  supplementalSets,
  unitPreference,
  onUpdateSet,
  onNext,
  nextExerciseName,
}: SupplementalLiftViewProps) {
  const variationDetails = {
    bbb: {
      title: 'Boring But Big',
      description: '5 sets of 10 reps at 50% of your Training Max',
      repsLabel: '10',
    },
    bbs: {
      title: 'Boring But Strong',
      description: '10 sets of 5 reps at First Set Last weight',
      repsLabel: '5',
    },
  };

  const details = variationDetails[variationType];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
          {details.title}
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {details.description}
        </p>
      </div>

      <AccessibleFormGroup
        legend={`Supplemental ${liftName}`}
        description="Complete all sets with the prescribed weight and reps"
        sets={supplementalSets}
        onUpdateSet={onUpdateSet}
        onAddSet={() => {}}
        onRemoveSet={() => {}}
        weightUnit={unitPreference}
        repsPlaceholder={details.repsLabel}
        weightPlaceholder="0"
        minSets={supplementalSets.length}
        maxSets={supplementalSets.length}
      />

      <button
        onClick={onNext}
        className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-500 dark:hover:bg-blue-400 active:bg-blue-700 dark:active:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700 dark:focus:ring-offset-blue-900"
      >
        Next: {nextExerciseName}
      </button>
    </div>
  );
}
