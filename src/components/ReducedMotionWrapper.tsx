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
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Animations
          </h3>
          <p className="text-sm text-gray-600">
            {animationsEnabled
              ? 'Animations and motion effects are enabled'
              : 'Animations are disabled for better accessibility'}
          </p>
          {prefersReduced && (
            <p className="text-xs text-blue-600 mt-2">
              Your system settings indicate a preference for reduced motion
            </p>
          )}
        </div>
        <button
          onClick={handleToggle}
          role="switch"
          aria-checked={animationsEnabled}
          aria-label="Toggle animations"
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${animationsEnabled ? 'bg-blue-600' : 'bg-gray-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${animationsEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    </div>
  );
}
