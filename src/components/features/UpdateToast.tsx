import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { SW_UPDATE_EVENT } from '../../lib/constants';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

/**
 * Non-blocking "new version available" toast, shown when the service worker
 * detects a new deploy while the app is open. Refreshing is always the
 * user's choice — dismissing costs nothing, since the next full page load
 * picks up the new version anyway (network-first navigation in sw.js).
 */
export default function UpdateToast() {
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateReady(true);
    window.addEventListener(SW_UPDATE_EVENT, handler);
    return () => window.removeEventListener(SW_UPDATE_EVENT, handler);
  }, []);

  if (!updateReady || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-in-bottom" role="status" aria-live="polite">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border-2 border-blue-600 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/40 rounded-full p-2 flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Update available</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              A new version of Ironform is ready. Refresh whenever it suits you — nothing is lost by waiting.
            </p>
            <Button size="sm" onClick={() => window.location.reload()}>
              Refresh now
            </Button>
          </div>
          <IconButton label="Dismiss update notice" onClick={() => setDismissed(true)} className="flex-shrink-0">
            <X className="w-5 h-5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
