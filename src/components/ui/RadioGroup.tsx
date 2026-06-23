interface RadioGroupOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
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

export default function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
  description,
  error,
  required = false,
  orientation = 'vertical'
}: RadioGroupProps) {
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
