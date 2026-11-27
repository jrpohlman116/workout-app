import { useEffect } from 'react';

type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } };

/**
 * Keeps the screen on while `active` (a session in progress). Uses the Wake
 * Lock API where the browser has it, and re-requests after the tab is shown
 * again, since the lock is released when the page is hidden. Browsers without
 * it simply follow the device's own screen timeout.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!active || !nav.wakeLock) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const next = await nav.wakeLock!.request('screen');
        if (cancelled) next.release().catch(() => {});
        else lock = next;
      } catch { /* denied, e.g. low battery */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
