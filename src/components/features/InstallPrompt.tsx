import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import Button from '../ui/Button';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const hasDeclined = localStorage.getItem('pwa-install-declined');
      if (!hasDeclined) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-declined', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-in-bottom">
      <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-blue-600">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Install App</h3>
            <p className="text-sm text-gray-600 mb-3">
              Install 531 Tracker on your home screen for quick access and offline use!
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Not now
              </Button>
            </div>
          </div>
          <IconButton label="Dismiss" onClick={handleDismiss} className="flex-shrink-0">
            <X className="w-5 h-5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
