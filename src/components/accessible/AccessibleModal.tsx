import { useEffect } from 'react';
import { X } from 'lucide-react';
import FocusTrap from './FocusTrap';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md'
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div
        className="absolute inset-0 bg-blue-950/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg ${sizeClasses[size]} max-h-[90vh] overflow-y-auto transition-colors`}
        >
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors">
            <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg p-1 transition-colors"
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
    </div>
  );
}
