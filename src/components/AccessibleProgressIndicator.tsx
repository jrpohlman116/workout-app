import { useEffect, useRef } from 'react';

interface AccessibleProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  variant?: 'bar' | 'steps';
}

export default function AccessibleProgressIndicator({
  current,
  total,
  label = 'Progress',
  variant = 'bar'
}: AccessibleProgressIndicatorProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const previousProgress = useRef(current);

  const percentage = Math.round((current / total) * 100);

  useEffect(() => {
    if (current !== previousProgress.current && progressRef.current) {
      const announcement = `${label}: ${current} of ${total} complete, ${percentage} percent`;

      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = announcement;

      document.body.appendChild(liveRegion);
      setTimeout(() => document.body.removeChild(liveRegion), 1000);

      previousProgress.current = current;
    }
  }, [current, total, label, percentage]);

  if (variant === 'steps') {
    return (
      <nav aria-label="Workout progress" className="mb-6">
        <ol className="flex items-center justify-between">
          {Array.from({ length: total }, (_, i) => {
            const stepNumber = i + 1;
            const isComplete = stepNumber < current;
            const isCurrent = stepNumber === current;

            return (
              <li
                key={stepNumber}
                className="flex-1 relative"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm
                      transition-colors duration-200
                      ${isComplete ? 'bg-green-600 border-green-600 text-white' : ''}
                      ${isCurrent ? 'bg-blue-600 border-blue-600 text-white' : ''}
                      ${!isComplete && !isCurrent ? 'bg-white border-gray-300 text-gray-500' : ''}
                    `}
                    role="img"
                    aria-label={
                      isComplete ? `Step ${stepNumber} completed` :
                      isCurrent ? `Step ${stepNumber} current` :
                      `Step ${stepNumber} not started`
                    }
                  >
                    {isComplete ? '✓' : stepNumber}
                  </div>
                  {stepNumber < total && (
                    <div
                      className={`
                        flex-1 h-0.5 mx-2
                        ${isComplete ? 'bg-green-600' : 'bg-gray-300'}
                      `}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span className="sr-only">
                  Step {stepNumber} of {total}
                  {isComplete && ' completed'}
                  {isCurrent && ' current'}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {current} of {total} steps complete
        </div>
      </nav>
    );
  }

  return (
    <div className="mb-6" ref={progressRef}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700" id="progress-label">
          {label}
        </span>
        <span
          className="text-sm font-bold text-blue-600 tabindex-0"
          aria-label={`${percentage} percent complete`}
        >
          {percentage}%
        </span>
      </div>

      <div
        className="relative"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-labelledby="progress-label"
        aria-valuetext={`${current} of ${total} complete, ${percentage} percent`}
      >
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-600" aria-hidden="true">
        Step {current} of {total}
      </div>
    </div>
  );
}
