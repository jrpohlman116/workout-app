import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface ListboxProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  id: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Listbox({
  label,
  value,
  options,
  onChange,
  id,
  description,
  required = false,
  disabled = false
}: ListboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const selectedIndex = options.findIndex(opt => opt.value === value);

  useEffect(() => {
    if (selectedIndex !== -1) {
      setFocusedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => (prev + 1) % options.length);
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          buttonRef.current?.focus();
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      default: {
        const char = e.key.toLowerCase();
        if (char.length === 1) {
          const index = options.findIndex(opt =>
            opt.label.toLowerCase().startsWith(char)
          );
          if (index !== -1) {
            setFocusedIndex(index);
            if (!isOpen) {
              onChange(options[index].value);
            }
          }
        }
      }
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
      >
        {label}
        {required && <span aria-label="required" className="text-red-600 ml-1">*</span>}
      </label>

      {description && (
        <p id={`${id}-description`} className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {description}
        </p>
      )}

      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption?.label || 'Select an option'}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 dark:text-gray-300 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <ul
            ref={listRef}
            role="listbox"
            aria-labelledby={id}
            tabIndex={-1}
            className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-auto focus:outline-none"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleOptionClick(option.value)}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between ${
                    isFocused
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <noscript>
        <select
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </noscript>
    </div>
  );
}
