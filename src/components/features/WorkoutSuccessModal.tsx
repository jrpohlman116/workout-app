interface WorkoutSuccessModalProps {
  liftName: string;
  estimated1RM: number;
  totalTonnage: number;
  unitPreference?: string;
  onClose: () => void;
}

export default function WorkoutSuccessModal({
  liftName,
  estimated1RM,
  totalTonnage,
  unitPreference = 'lb',
  onClose
}: WorkoutSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full animate-scale-in">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">
            {liftName}
          </p>
          <div className="space-y-8 mb-8">
            <div className="text-left">
              <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Estimated Max</p>
              <p className="text-7xl font-black text-gray-900 dark:text-gray-100 leading-none tabular-nums">
                {Math.round(estimated1RM)}<span className="text-2xl font-semibold text-gray-400 dark:text-gray-500 ml-2">{unitPreference}</span>
              </p>
            </div>

            <div className="text-left pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Tonnage</p>
              <p className="text-3xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                {totalTonnage.toLocaleString()}<span className="text-base font-medium text-gray-400 dark:text-gray-500 ml-2">{unitPreference}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            View Progress
          </button>
        </div>
      </div>
    </div>
  );
}
