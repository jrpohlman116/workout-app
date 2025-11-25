import { ReactNode, useEffect, useState } from 'react';

interface ReducedMotionWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  forceReduce?: boolean;
}

export default function ReducedMotionWrapper({
  children,
  fallback,
  forceReduce = false
}: ReducedMotionWrapperProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches || forceReduce);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches || forceReduce);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [forceReduce]);

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  if (prefersReducedMotion) {
    return null;
  }

  return <>{children}</>;
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

interface AnimationControlsProps {
  onToggle?: (enabled: boolean) => void;
}

export function AnimationControls({ onToggle }: AnimationControlsProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setAnimationsEnabled(false);
    }
  }, [prefersReduced]);

  const handleToggle = () => {
    const newState = !animationsEnabled;
    setAnimationsEnabled(newState);

    if (onToggle) {
      onToggle(newState);
    }

    if (newState) {
      document.documentElement.classList.remove('reduce-motion');
    } else {
      document.documentElement.classList.add('reduce-motion');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Animations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {animationsEnabled
              ? 'Animations and motion effects are enabled'
              : 'Animations are disabled for better accessibility'}
          </p>
          {prefersReduced && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Your system settings indicate a preference for reduced motion
            </p>
          )}
        </div>
        <button
          onClick={handleToggle}
          role="switch"
          aria-checked={animationsEnabled}
          aria-label="Toggle animations"
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          style={{
            backgroundColor: animationsEnabled
              ? 'rgb(37, 99, 235)'
              : 'rgb(229, 231, 235)'
          }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{
              transform: animationsEnabled ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
            }}
          />
        </button>
      </div>
    </div>
  );
}
