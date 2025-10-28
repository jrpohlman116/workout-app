import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { useState } from 'react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AccessibleAlertProps {
  type: AlertType;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  role?: 'alert' | 'status';
}

export default function AccessibleAlert({
  type,
  title,
  children,
  dismissible = false,
  onDismiss,
  role = type === 'error' ? 'alert' : 'status'
}: AccessibleAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const styles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertCircle,
      iconColor: 'text-yellow-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: XCircle,
      iconColor: 'text-red-600'
    }
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div
      role={role}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`${style.bg} border ${style.border} rounded-xl p-4 ${style.text}`}
    >
      <div className="flex gap-3">
        <Icon
          className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold mb-1" id={`alert-title-${Date.now()}`}>
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            className={`flex-shrink-0 ${style.iconColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
