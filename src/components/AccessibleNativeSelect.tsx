import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AccessibleNativeSelectProps {
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

export default function AccessibleNativeSelect({
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
}: AccessibleNativeSelectProps) {
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
        className="block text-sm font-semibold text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-600 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {description && (
        <p id={`${id}-description`} className="text-sm text-gray-600">
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
            w-full px-4 py-3 pr-10 border rounded-xl bg-white appearance-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
            transition-all
            ${error ? 'border-red-500' : 'border-gray-300'}
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
            ${disabled ? 'text-gray-400' : 'text-gray-600'}
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

interface RadioGroupOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AccessibleRadioGroupProps {
  legend: string;
  name: string;
  value: string | number;
  options: RadioGroupOption[];
  onChange: (value: string | number) => void;
  description?: string;
  error?: string;
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function AccessibleRadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
  description,
  error,
  required = false,
  orientation = 'vertical'
}: AccessibleRadioGroupProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-700">
        {legend}
        {required && (
          <span className="text-red-600 ml-1" aria-label="required">
            *
          </span>
        )}
      </legend>

      {description && (
        <p id={`${name}-description`} className="text-sm text-gray-600 -mt-1">
          {description}
        </p>
      )}

      <div
        className={`
          ${orientation === 'horizontal'
            ? 'flex flex-wrap gap-3'
            : 'space-y-2'
          }
        `}
        role="radiogroup"
        aria-describedby={
          description || error
            ? `${description ? `${name}-description` : ''} ${error ? `${name}-error` : ''}`.trim()
            : undefined
        }
        aria-required={required}
        aria-invalid={error ? 'true' : 'false'}
      >
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const isChecked = value === option.value;

          return (
            <label
              key={String(option.value)}
              htmlFor={id}
              className={`
                relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer
                transition-all
                ${isChecked
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
                }
                ${option.disabled
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
                }
              `}
            >
              <input
                type="radio"
                id={id}
                name={name}
                value={option.value}
                checked={isChecked}
                onChange={() => !option.disabled && onChange(option.value)}
                disabled={option.disabled}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300"
              />
              <div className="flex-1">
                <span className="block font-medium text-gray-900">
                  {option.label}
                </span>
                {option.description && (
                  <span className="block text-sm text-gray-600 mt-1">
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 flex items-start gap-1"
          role="alert"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
