import { useEffect, useState } from 'react';
import { getTodayReadiness, type ReadinessDay } from '../lib/readiness/store';

/**
 * Today's readiness for a signed-in user who has finished onboarding.
 * Computed and stored on the first open of the day; later opens read the
 * stored row. A failure leaves it null; nothing in a session depends on it
 * being there, so the app carries on as written.
 */
export function useTodayReadiness(userId: string | undefined, enabled = true) {
  const [readiness, setReadiness] = useState<ReadinessDay | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    getTodayReadiness(userId)
      .then(day => { if (!cancelled) setReadiness(day); })
      .catch(error => console.warn('Readiness unavailable:', error));
    return () => { cancelled = true; };
  }, [userId, enabled]);

  return readiness;
}
