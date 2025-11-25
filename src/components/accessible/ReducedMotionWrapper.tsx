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
          <p className="text-sm text-gray-600 dark:text-gray-400">
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
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={animationsEnabled}
            onChange={handleToggle}
            className="sr-only peer"
            aria-label="Toggle animations"
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-colors duration-200"></div>
          <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 peer-checked:translate-x-5 shadow-sm"></div>
        </label>
      </div>
    </div>
  );
}
