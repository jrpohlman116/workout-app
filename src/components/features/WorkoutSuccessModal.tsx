import { useEffect } from 'react';
import FocusTrap from '../accessible/FocusTrap';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';

interface WorkoutSuccessModalProps {
  liftName: string;
  estimated1RM: number;
  totalTonnage: number;
  unitPreference?: string;
  onClose: () => void;
  onSetAsMax?: () => Promise<void>;
}

export default function WorkoutSuccessModal({
  liftName,
  estimated1RM,
  totalTonnage,
  unitPreference = 'lb',
  onClose,
  onSetAsMax,
}: WorkoutSuccessModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-gray-900/75 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <FocusTrap active onEscape={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full motion-safe:animate-scale-in">
          <div className="text-center">
            <SectionLabel id="success-modal-title" tone="page" className="mb-6">{liftName}</SectionLabel>

            <div className="space-y-8 mb-8">
              <div className="text-left">
                <SectionLabel tone="page" className="mb-2">Estimated Max</SectionLabel>
                <p className="text-7xl font-black text-gray-900 dark:text-gray-100 leading-none tabular-nums">
                  {Math.round(estimated1RM)}<span className="text-2xl font-semibold text-gray-400 dark:text-gray-500 ml-2">{unitPreference}</span>
                </p>
              </div>

              <div className="text-left pt-4 border-t border-gray-100 dark:border-gray-700">
                <SectionLabel tone="page" className="mb-1">Tonnage</SectionLabel>
                <p className="text-3xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                  {totalTonnage.toLocaleString()}<span className="text-base font-medium text-gray-400 dark:text-gray-500 ml-2">{unitPreference}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button fullWidth onClick={onClose}>View Progress</Button>
              {onSetAsMax && estimated1RM > 0 && (
                <button
                  onClick={async () => { await onSetAsMax(); onClose(); }}
                  className="w-full py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Set {Math.round(estimated1RM)} {unitPreference} as new max
                </button>
              )}
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
