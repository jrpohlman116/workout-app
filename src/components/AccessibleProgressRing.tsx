interface AccessibleProgressRingProps {
  value: number;
  max: number;
  label: string;
  description?: string;
  size?: number;
}

export default function AccessibleProgressRing({
  value,
  max,
  label,
  description,
  size = 192
}: AccessibleProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size / 2) - 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" role="group" aria-label={label}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="img"
        aria-label={`${label}: ${value} out of ${max}, ${percentage.toFixed(0)}% complete`}
      >
        <title>{`${label}: ${value} out of ${max}`}</title>
        <desc>{description || `Progress indicator showing ${percentage.toFixed(0)}% completion`}</desc>

        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="16"
          aria-hidden="true"
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#accessible-gradient)"
          strokeWidth="16"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          aria-hidden="true"
        />

        <defs>
          <linearGradient id="accessible-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900" aria-hidden="true">
            {value}
          </div>
          {description && (
            <div className="text-sm text-gray-600 mt-1" aria-hidden="true">
              {description}
            </div>
          )}
        </div>
      </div>

      <div className="sr-only">
        {label}: {value} out of {max}, which is {percentage.toFixed(0)} percent complete.
        {description && ` ${description}`}
      </div>
    </div>
  );
}
