import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface RadioCardOption<T> {
  value: T;
  title: string;
  description?: string;
}

interface RadioCardsProps<T> {
  options: RadioCardOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  /** Id of the element that labels the group. */
  labelId?: string;
  /** Used when no visible label element exists. */
  ariaLabel?: string;
  /** 'segmented': one row of equal options, like the Time Picker. */
  layout?: 'cards' | 'segmented';
}

const segmentClass = (selected: boolean) =>
  `flex-1 min-h-[44px] py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
    selected
      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

const optionClass = (selected: boolean) =>
  `px-3 py-2 rounded-lg transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
    selected
      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  }`;

/**
 * A radio group of cards that follows the ARIA pattern: one tab stop (the
 * selected option), arrow keys move and select, Home and End jump to the ends.
 */
export default function RadioCards<T extends string | number>({
  options, value, onSelect, labelId, ariaLabel, layout = 'cards',
}: RadioCardsProps<T>) {
  const segmented = layout === 'segmented';
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex(o => o.value === value));

  const move = (to: number) => {
    const index = (to + options.length) % options.length;
    onSelect(options[index].value);
    refs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        move(index + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        move(0);
        break;
      case 'End':
        event.preventDefault();
        move(options.length - 1);
        break;
    }
  };

  return (
    <div role="radiogroup" aria-labelledby={labelId} aria-label={labelId ? undefined : ariaLabel} className={segmented ? 'flex gap-1 p-1 rounded-xl bg-gray-50 dark:bg-gray-900' : 'grid grid-cols-1 gap-2'}>
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={String(option.value)}
            ref={el => { refs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(option.value)}
            onKeyDown={e => onKeyDown(e, index)}
            className={segmented ? segmentClass(selected) : optionClass(selected)}
          >
            {segmented ? option.title : (
              <>
                <span className="block text-sm font-medium">{option.title}</span>
                {option.description && <span className="block text-xs font-normal opacity-70 mt-0.5">{option.description}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
