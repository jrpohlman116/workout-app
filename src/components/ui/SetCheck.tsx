import { Check } from 'lucide-react';

interface SetCheckProps {
  checked: boolean;
  label: string;
  /** Shown while unchecked — typically the set number. */
  display?: string;
  onToggle: () => void;
}

/**
 * Tappable "set done" toggle. WCAG 2.2: state is exposed via aria-pressed
 * and marked by the check icon (never color alone), the hit target is
 * 40x40px, and keyboard focus gets a visible ring.
 */
export default function SetCheck({ checked, label, display, onToggle }: SetCheckProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      onClick={onToggle}
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-gray-800 ${
        checked
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-500'
      }`}
    >
      {checked ? <Check className="w-5 h-5" aria-hidden="true" /> : (display ?? '')}
    </button>
  );
}
