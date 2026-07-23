import { useEffect, useState } from 'react';
import { Share2, X } from 'lucide-react';
import FocusTrap from '../accessible/FocusTrap';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import { useCountUp } from '../../hooks/useAnimations';
import { buildShareImageBlob } from '../../lib/shareImage';

interface CompletedAccessory {
  name: string;
  setsCompleted: number;
}

interface WorkoutSuccessModalProps {
  liftName: string;
  /** True on accessory-only days (upper day) — there's no main lift, so the
      hero stat and "set as max" affordance don't apply. */
  isAccessoryOnly: boolean;
  estimated1RM: number;
  totalTonnage: number;
  completedAccessories: CompletedAccessory[];
  waveLabel?: string;
  unitPreference?: string;
  onClose: () => void;
  onSetAsMax?: () => Promise<void>;
  newTrainingMax?: number;
}

type ShareState = 'idle' | 'preparing' | 'error';

export default function WorkoutSuccessModal({
  liftName,
  isAccessoryOnly,
  estimated1RM,
  totalTonnage,
  completedAccessories,
  waveLabel,
  unitPreference = 'lb',
  onClose,
  onSetAsMax,
  newTrainingMax,
}: WorkoutSuccessModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const [shareState, setShareState] = useState<ShareState>('idle');

  const heroLabel = isAccessoryOnly ? 'Tonnage' : 'Estimated Max';
  const heroValue = Math.round(isAccessoryOnly ? totalTonnage : estimated1RM);
  const animatedHero = useCountUp(heroValue, 900);

  const handleShare = async () => {
    setShareState('preparing');
    try {
      const blob = await buildShareImageBlob({
        liftName,
        waveLabel,
        heroLabel,
        heroValue,
        unit: unitPreference,
        tonnage: Math.round(totalTonnage),
        accessoryCount: completedAccessories.length,
      });
      if (!blob) throw new Error('Image generation unavailable');

      const file = new File([blob], 'ironform-workout.png', { type: 'image/png' });
      const shareData: ShareData & { files: File[] } = {
        files: [file],
        title: 'Ironform',
        text: `${liftName} — ${heroValue} ${unitPreference} ${heroLabel.toLowerCase()}`,
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ironform-workout.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
      setShareState('idle');
    } catch (error) {
      // A user cancelling the native share sheet isn't a real failure.
      if (error instanceof Error && error.name === 'AbortError') {
        setShareState('idle');
        return;
      }
      setShareState('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white dark:bg-gray-900 sm:bg-gray-900/75 sm:flex sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <FocusTrap active onEscape={onClose} className="block h-full sm:contents">
        <div className="relative flex h-full w-full flex-col overflow-y-auto bg-white dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-md sm:rounded-2xl sm:shadow-lg animate-modal-in">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:p-8">
            <div className="animate-enter" style={{ animationDelay: '40ms' }}>
              <SectionLabel id="success-modal-title" tone="page" className="mb-1">
                {liftName}
              </SectionLabel>
              {waveLabel && (
                <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">{waveLabel}</p>
              )}
            </div>

            <div
              className="relative mb-8 animate-enter"
              style={{ animationDelay: '120ms' }}
            >
              <div
                className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 rounded-full bg-blue-500/30 blur-3xl animate-pulse-reveal"
                aria-hidden="true"
              />
              <SectionLabel tone="page" className="mb-2">{heroLabel}</SectionLabel>
              <p className="relative text-7xl font-black leading-none tabular-nums text-gray-900 dark:text-gray-100">
                {animatedHero.toLocaleString()}
                <span className="ml-2 text-2xl font-semibold text-gray-400 dark:text-gray-400">{unitPreference}</span>
              </p>
            </div>

            {!isAccessoryOnly && (
              <div
                className="mb-8 border-t border-gray-100 pt-4 animate-enter dark:border-gray-700"
                style={{ animationDelay: '200ms' }}
              >
                <SectionLabel tone="page" className="mb-1">Tonnage</SectionLabel>
                <p className="text-3xl font-bold tabular-nums text-gray-700 dark:text-gray-300">
                  {totalTonnage.toLocaleString()}
                  <span className="ml-2 text-base font-medium text-gray-400 dark:text-gray-400">{unitPreference}</span>
                </p>
              </div>
            )}

            {completedAccessories.length > 0 && (
              <div
                className="mb-8 border-t border-gray-100 pt-4 animate-enter dark:border-gray-700"
                style={{ animationDelay: '260ms' }}
              >
                <SectionLabel tone="page" className="mb-3">Accessories</SectionLabel>
                <ul className="space-y-2">
                  {completedAccessories.map(accessory => (
                    <li
                      key={accessory.name}
                      className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{accessory.name}</span>
                      <span className="text-gray-400 dark:text-gray-500">
                        {accessory.setsCompleted} {accessory.setsCompleted === 1 ? 'set' : 'sets'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 animate-enter" style={{ animationDelay: '320ms' }}>
              <Button fullWidth onClick={onClose}>View Progress</Button>
              {!isAccessoryOnly && onSetAsMax && newTrainingMax != null && (
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={async () => { await onSetAsMax(); onClose(); }}
                >
                  Set {newTrainingMax} {unitPreference} as new training max
                </Button>
              )}
              <Button
                variant="tertiary"
                size="md"
                fullWidth
                icon={<Share2 className="h-4 w-4" />}
                onClick={handleShare}
                disabled={shareState === 'preparing'}
              >
                {shareState === 'preparing' ? 'Preparing…' : 'Share'}
              </Button>
              {shareState === 'error' && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  Couldn't share — try again.
                </p>
              )}
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
