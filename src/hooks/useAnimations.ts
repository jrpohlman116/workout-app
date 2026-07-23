import { useEffect, useState } from 'react';

export function useCountUp(end: number, duration: number = 1000, start: number = 0) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    const reduceMotion =
      document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setCount(end);
      return;
    }

    const easeOutExpo = (t: number) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

    let startTimestamp: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = easeOutExpo(progress);

      setCount(progress >= 1 ? end : Math.round(eased * (end - start) + start));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [end, duration, start]);

  return count;
}

export function useRipple() {
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple');

    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  return createRipple;
}

export function useStaggeredAnimation(itemCount: number, delay: number = 100) {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    if (visibleItems < itemCount) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visibleItems, itemCount, delay]);

  return visibleItems;
}
