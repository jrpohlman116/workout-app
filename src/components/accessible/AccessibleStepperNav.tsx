import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  isComplete: boolean;
}

interface AccessibleStepperNavProps {
  steps: Step[];
  currentStepId: string;
  onNavigate: (stepId: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: (stepId: string) => void;
  allowSkip?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

export default function AccessibleStepperNav({
  steps,
  currentStepId,
  onNavigate,
  onNext,
  onPrevious,
  onSkip,
  allowSkip = false,
  nextLabel = 'Next',
  previousLabel = 'Previous'
}: AccessibleStepperNavProps) {
  const currentStepRef = useRef<HTMLDivElement>(null);
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  const currentStep = steps[currentIndex];
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;

  useEffect(() => {
    if (currentStepRef.current) {
      const announcement = `${currentStep.label}. Step ${currentIndex + 1} of ${steps.length}`;
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = announcement;

      document.body.appendChild(liveRegion);
      setTimeout(() => document.body.removeChild(liveRegion), 1000);
    }
  }, [currentStepId, currentStep, currentIndex, steps.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft' && !isFirstStep && onPrevious) {
          e.preventDefault();
          onPrevious();
        } else if (e.key === 'ArrowRight' && !isLastStep && onNext) {
          e.preventDefault();
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNext, onPrevious]);

  return (
    <div className="space-y-4" ref={currentStepRef}>
      <nav aria-label="Workout steps">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-gray-700">
              Step {currentIndex + 1} of {steps.length}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use Ctrl+Arrow keys to navigate
            </p>
          </div>
        </div>

        {allowSkip && (
          <details className="mb-4 bg-gray-50 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm text-gray-700">
              Jump to step
            </summary>
            <div className="px-4 pb-4 space-y-1">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => {
                    if (onSkip) {
                      onSkip(step.id);
                    } else {
                      onNavigate(step.id);
                    }
                  }}
                  disabled={step.id === currentStepId}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${step.id === currentStepId
                      ? 'bg-blue-100 text-blue-700 font-semibold cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                  aria-current={step.id === currentStepId ? 'step' : undefined}
                >
                  <span className="flex items-center gap-2">
                    {step.isComplete && (
                      <span className="text-green-600" aria-label="completed">
                        ✓
                      </span>
                    )}
                    <span>
                      {index + 1}. {step.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </details>
        )}
      </nav>

      <div className="flex gap-3" role="group" aria-label="Step navigation">
        <button
          onClick={onPrevious}
          disabled={isFirstStep || !onPrevious}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label={`${previousLabel}. ${isFirstStep ? 'No previous step' : `Go to ${steps[currentIndex - 1]?.label}`}`}
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          <span>{previousLabel}</span>
        </button>

        <button
          onClick={onNext}
          disabled={isLastStep || !onNext}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label={`${nextLabel}. ${isLastStep ? 'Last step' : `Go to ${steps[currentIndex + 1]?.label}`}`}
        >
          <span>{isLastStep ? 'Complete' : nextLabel}</span>
          {!isLastStep && <ChevronRight className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={() => steps.length > 0 && onNavigate(steps[steps.length - 1].id)}
          className="text-sm text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          aria-label="Skip to last step"
        >
          <SkipForward className="w-4 h-4 inline mr-1" aria-hidden="true" />
          Skip to end
        </button>
      </div>
    </div>
  );
}
