import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

type InputVariant = 'default' | 'onDark';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  variant?: InputVariant;
}

const base = 'w-full px-4 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-colors';

const variantStyles: Record<InputVariant, string> = {
  default: 'py-3 border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500',
  onDark:  'py-4 border border-transparent bg-white text-gray-900 placeholder:text-gray-400 focus:ring-white/60',
};

const labelStyles: Record<InputVariant, string> = {
  default: 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2',
  onDark:  'block text-xs tracking-wide text-white/70 mb-2',
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, variant = 'default', className = '', id, ...props },
  ref
) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className={labelStyles[variant]}>
          {label}
        </label>
      )}
      <input ref={ref} id={id} className={`${base} ${variantStyles[variant]} ${className}`} {...props} />
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
  );
});

export default Input;
