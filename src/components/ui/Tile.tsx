import { ChevronRight } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Primary text. Omit to use children for a fully custom body. */
  title?: string;
  description?: string;
  /** Leading element — icon, badge, number, avatar, etc. */
  leading?: ReactNode;
  /**
   * Trailing element. Defaults to a ChevronRight.
   * Pass `null` to suppress the trailing entirely.
   */
  trailing?: ReactNode;
}

export default function Tile({
  title,
  description,
  leading,
  trailing = <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-400 flex-shrink-0" />,
  className = '',
  children,
  ...props
}: TileProps) {
  return (
    <button
      type="button"
      className={[
        'w-full flex items-center gap-4 p-4 rounded-xl text-left',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0 text-left">
        {title && (
          <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">{title}</p>
        )}
        {description && (
          <p className="text-sm mt-0.5 opacity-70">{description}</p>
        )}
        {children}
      </div>
      {trailing}
    </button>
  );
}
