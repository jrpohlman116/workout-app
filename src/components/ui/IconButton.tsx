import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonVariant = 'default' | 'primary' | 'danger';
type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visible tooltip text AND the aria-label for screen readers — required */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-400 dark:focus:ring-gray-500',
  primary: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:ring-blue-500 dark:focus:ring-blue-400',
  danger:  'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-500 dark:focus:ring-red-400',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'p-1.5',
  md: 'p-2',
};

export default function IconButton({
  label,
  variant = 'default',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: IconButtonProps) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        className={[
          'rounded-xl transition-colors focus:outline-none focus:ring-2',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50"
      >
        {label}
      </span>
    </span>
  );
}
