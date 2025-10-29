import { useState } from 'react';

interface ChartDataPoint {
  value: number;
  date: string;
}

interface ChartData {
  type: string;
  name: string;
  color: string;
  data: ChartDataPoint[];
}

interface ProgressChartProps {
  chartData: ChartData[];
  unitPreference: string;
}

export default function ProgressChart({ chartData, unitPreference }: ProgressChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; lift: string } | null>(null);

  const allValues = chartData.flatMap(d => d.data.map(p => p.value));
  if (allValues.length === 0) return null;

  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  const chartPadding = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartWidth = 600;
  const chartHeight = 300;
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const yTicks = 5;
  const yStep = range / yTicks;

  const maxDataPoints = Math.max(...chartData.map(d => d.data.length));

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64">
          <defs>
            {chartData.map((lift, idx) => (
              <linearGradient key={idx} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={lift.color} />
                <stop offset="100%" stopColor={lift.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
          </defs>

          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const yValue = minValue + (yStep * i);
            const y = chartPadding.top + plotHeight - (i / yTicks) * plotHeight;

            return (
              <g key={i}>
                <line
                  x1={chartPadding.left}
                  y1={y}
                  x2={chartWidth - chartPadding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={chartPadding.left - 10}
                  y={y + 4}
                  fontSize="11"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {Math.round(yValue)}
                </text>
              </g>
            );
          })}

          {chartData.map((lift, liftIdx) => {
            if (lift.data.length === 0) return null;

            const points = lift.data.map((point, i) => {
              const x = chartPadding.left + (i / Math.max(lift.data.length - 1, 1)) * plotWidth;
              const y = chartPadding.top + plotHeight - ((point.value - minValue) / range) * plotHeight;
              return { x, y, value: point.value };
            });

            const pathPoints = points.map(p => `${p.x},${p.y}`).join(' ');

            return (
              <g key={liftIdx}>
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke={lift.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />

                {points.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="white"
                    stroke={lift.color}
                    strokeWidth="2.5"
                    className="cursor-pointer transition-all hover:r-7"
                    onMouseEnter={() => setHoveredPoint({ x: point.x, y: point.y, value: point.value, lift: lift.name })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </g>
            );
          })}

          {Array.from({ length: Math.min(maxDataPoints, 10) }).map((_, i) => {
            const x = chartPadding.left + (i / Math.max(maxDataPoints - 1, 1)) * plotWidth;
            const sessionNumber = i + 1;

            return (
              <text
                key={i}
                x={x}
                y={chartHeight - chartPadding.bottom + 20}
                fontSize="11"
                fill="#9ca3af"
                textAnchor="middle"
              >
                {sessionNumber}
              </text>
            );
          })}

          <text
            x={chartWidth / 2}
            y={chartHeight - 10}
            fontSize="12"
            fill="#6b7280"
            textAnchor="middle"
            fontWeight="500"
          >
            Workout Session
          </text>

          <text
            x={15}
            y={chartHeight / 2}
            fontSize="12"
            fill="#6b7280"
            textAnchor="middle"
            fontWeight="500"
            transform={`rotate(-90, 15, ${chartHeight / 2})`}
          >
            1RM ({unitPreference})
          </text>
        </svg>

        {hoveredPoint && (
          <div
            className="absolute bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none z-10"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(hoveredPoint.y / chartHeight) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <div className="font-semibold">{hoveredPoint.lift}</div>
            <div>{Math.round(hoveredPoint.value)} {unitPreference}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {chartData.map((lift) => (
          <div key={lift.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: lift.color }}
            />
            <span className="text-sm text-gray-700 font-medium">{lift.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
