import type { HTMLAttributes } from 'react';

type Tone = 'page' | 'card';

interface SectionLabelProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  page: 'text-gray-400 dark:text-gray-200',
  card: 'text-gray-500 dark:text-gray-400',
};

export default function SectionLabel({ children, tone = 'card', className = '', ...props }: SectionLabelProps) {
  return (
    <p className={`text-xs uppercase tracking-widest font-semibold ${tones[tone]} ${className}`} {...props}>
      {children}
    </p>
  );
}
