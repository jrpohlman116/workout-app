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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-scale-in">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {liftName}
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mb-6 rounded-full"></div>

          <div className="space-y-6 mb-8">
            <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">Estimated 1 Rep Max</p>
              <p className="text-3xl font-bold text-gray-900">{Math.round(estimated1RM)} {unitPreference}</p>
            </div>

            <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">Today's Tonnage</p>
              <p className="text-3xl font-bold text-gray-900">{totalTonnage.toLocaleString()} {unitPreference}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            View Progress
          </button>
        </div>
      </div>
    </div>
  );
}
