import SectionLabel from './SectionLabel';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  titleClassName?: string;
}

export default function PageHeader({ eyebrow, title, titleClassName = 'font-black' }: PageHeaderProps) {
  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-6">
      <SectionLabel tone="page" className="mb-1">{eyebrow}</SectionLabel>
      <h1 className={`text-4xl text-gray-900 dark:text-gray-100 animate-slide-in-left ${titleClassName}`}>
        {title}
      </h1>
    </div>
  );
}
