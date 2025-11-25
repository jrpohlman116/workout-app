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
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl'
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
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 id={titleId} className="text-xl font-bold text-gray-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
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
