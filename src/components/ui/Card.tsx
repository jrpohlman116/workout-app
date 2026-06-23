interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function Card({ children, className = '', style, onClick }: CardProps) {
  const base = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={style} className={`${base} ${className}`}>
        {children}
      </button>
    );
  }
  return <div style={style} className={`${base} ${className}`}>{children}</div>;
}
