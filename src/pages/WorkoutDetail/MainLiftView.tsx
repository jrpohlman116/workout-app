import AccessibleFormGroup from '../../components/accessible/AccessibleFormGroup';
import { SetInput } from './types';

interface MainLiftViewProps {
  liftName: string;
  mainSets: SetInput[];
  mainReps: string | number;
  unitPreference: string;
  lastSetData: string;
  onUpdateSet: (index: number, field: 'reps' | 'weight', value: string) => void;
  onNext: () => void;
  nextExerciseName: string | null;
}

export default function MainLiftView({
  liftName,
  mainSets,
  mainReps,
  unitPreference,
  lastSetData,
  onUpdateSet,
  onNext,
  nextExerciseName,
}: MainLiftViewProps) {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <AccessibleFormGroup
        legend={`Barbell ${liftName}`}
        description="Record your main working sets. Set 3 is AMRAP (As Many Reps As Possible)"
        sets={mainSets}
        onUpdateSet={onUpdateSet}
        onAddSet={() => {}}
        onRemoveSet={() => {}}
        weightUnit={unitPreference}
        repsPlaceholder={mainReps === '5-3-1' ? '5' : String(mainReps)}
        weightPlaceholder="0"
        minSets={3}
        maxSets={3}
        lastSetData={lastSetData}
      />

      <button
        onClick={onNext}
        className="w-full bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 py-4 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
      >
        Next: {nextExerciseName}
      </button>
    </div>
  );
}
