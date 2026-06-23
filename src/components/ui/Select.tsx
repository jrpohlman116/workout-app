import { ChevronDown } from 'lucide-react';
import { useState, useRef } from 'react';

interface Option {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  id: string;
  label: string;
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  id,
  label,
  value,
  options,
  onChange,
  description,
  error,
  required = false,
  disabled = false,
  className = ''
}: SelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const option = options.find(opt => String(opt.value) === newValue);
    if (option) {
      onChange(option.value);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-600 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {description && (
        <p id={`${id}-description`} className="text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>
      )}

      <div className="relative">
        <select
          ref={selectRef}
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          required={required}
          aria-describedby={
            description || error
              ? `${description ? `${id}-description` : ''} ${error ? `${id}-error` : ''}`.trim()
              : undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          className={`
            w-full px-4 py-3 pr-10 border rounded-xl bg-white dark:bg-gray-700 appearance-none
            text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60
            transition-all
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'}
            ${isFocused ? 'shadow-md' : 'shadow-sm'}
          `}
        >
          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
              {option.description ? ` - ${option.description}` : ''}
            </option>
          ))}
        </select>

        <ChevronDown
          className={`
            absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none
            transition-colors
            ${disabled ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}
          `}
          aria-hidden="true"
        />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="text-sm text-red-600 flex items-start gap-1"
          role="alert"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      {selectedOption?.description && !description && (
        <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          {selectedOption.description}
        </p>
      )}
    </div>
  );
}
