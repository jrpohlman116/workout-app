import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import FocusTrap from './FocusTrap';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  preventClose?: boolean;
  /** Full-bleed below the sm breakpoint (phone-first flows); centered card
      with backdrop from sm up. Default keeps the centered card everywhere. */
  fullScreen?: boolean;
}

export default function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  preventClose = false,
  fullScreen = false,
}: AccessibleModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'w-96 max-w-[calc(100vw-2rem)]',
    md: 'w-[28rem] max-w-[calc(100vw-2rem)]',
    lg: 'w-[42rem] max-w-[calc(100vw-2rem)]'
  };

  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const descId = description ? `modal-desc-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  // Same widths as sizeClasses, but only applied from sm up — below that
  // the fullScreen panel is edge-to-edge with no width cap.
  const fullScreenSizeClasses = {
    sm: 'sm:w-96 sm:max-w-[calc(100vw-2rem)]',
    md: 'sm:w-[28rem] sm:max-w-[calc(100vw-2rem)]',
    lg: 'sm:w-[42rem] sm:max-w-[calc(100vw-2rem)]'
  };

  // Portal to <body>: ancestors with retained transforms (e.g. the page
  // slide-in animation wrappers) would otherwise become the containing
  // block for this fixed dialog, sizing it to the page instead of the
  // viewport.
  const panelClasses = fullScreen
    ? `relative bg-white dark:bg-gray-800 w-full h-full max-h-full rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:shadow-lg ${fullScreenSizeClasses[size]} overflow-y-auto transition-colors animate-modal-in`
    : `relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg ${sizeClasses[size]} max-h-[90vh] overflow-y-auto transition-colors animate-modal-in`;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${fullScreen ? 'p-0 sm:p-4' : 'p-4'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div
        className="absolute inset-0 bg-gray-900/75 transition-opacity"
        onClick={preventClose ? undefined : onClose}
        aria-hidden="true"
      />

      <FocusTrap
        active={isOpen}
        onEscape={preventClose ? undefined : onClose}
        className={fullScreen ? 'w-full h-full sm:w-auto sm:h-auto' : undefined}
      >
        <div className={panelClasses}>
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors">
            <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={preventClose}
              aria-label={preventClose ? 'Close (operation in progress)' : 'Close dialog'}
              className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg p-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {description && (
            <p id={descId} className="sr-only">
              {description}
            </p>
          )}

          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body
  );
}
