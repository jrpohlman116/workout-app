import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../../contexts/ThemeContext';
import type { MeetGroup } from '../../../lib/types';

interface ChartDataPoint {
  value: number;
  date: string;
  cycle: number;
  week: number;
}

interface ChartData {
  type: string;
  name: string;
  color: string;
  data: ChartDataPoint[];
}

interface ProgressChartProps {
  chartData: ChartData[];
  meets: MeetGroup[];
  unitPreference: string;
}

const LIFT_TYPES = ['squat', 'bench', 'deadlift'] as const;
const BEST_KEYS = { squat: 'bestSquat', bench: 'bestBench', deadlift: 'bestDeadlift' } as const;

// 5-point star outline, used both for the meet-day dot marker and the legend swatch.
function starPoints(cx: number, cy: number, outerR: number, innerR: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function makeMeetDot(color: string) {
  return (props: any) => {
    const { cx, cy, value } = props;
    if (cx == null || cy == null || value == null) return null;
    return <polygon points={starPoints(cx, cy, 7, 3)} fill={color} stroke="white" strokeWidth={1.5} />;
  };
}

function CustomLegend({ payload }: any) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-1.5 pt-2">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{entry.value}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="-7 -7 14 14" className="flex-shrink-0" aria-hidden="true">
          <polygon points={starPoints(0, 0, 6, 2.6)} fill="#111827" stroke="white" strokeWidth={1} />
        </svg>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Meet PR</span>
      </div>
    </div>
  );
}

export default function ProgressChart({ chartData, meets, unitPreference }: ProgressChartProps) {
  const { isDarkMode } = useTheme();

  const textColor = isDarkMode ? '#d1d5db' : '#6b7280';
  const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

  // Training rows: one per (cycle, week), same as before — squat's sessions set the pace.
  const trainingRows: any[] = chartData[0]?.data.map((_, index) => {
    const source = chartData[0].data[index];
    const point: any = {
      dateKey: source.date.split('T')[0],
      date: source.date,
      cycle: source.cycle,
      week: source.week,
    };

    chartData.forEach(lift => {
      for (let i = 0; i < lift.data.length; i++) {
        if (lift.data[i].cycle == point.cycle && lift.data[i].week == point.week) {
          point[lift.type] = lift.data[i].value ?? null;
          point[`${lift.type}_date`] = lift.data[i].date ?? null;
        }
      }
    });
    return point;
  }) || [];

  const rowsByDateKey = new Map<string, any>(trainingRows.map(r => [r.dateKey, r]));

  // Meets are keyed by their real date, not by cycle/week — they slot into the
  // existing weekly rows if they land on the same day, otherwise get their own
  // point. Only successful (made) attempts are plotted.
  meets.forEach(meet => {
    const bests = LIFT_TYPES.reduce<Record<string, number | null>>((acc, type) => {
      const best = meet[BEST_KEYS[type]];
      acc[type] = best ? best.weight_lifted : null;
      return acc;
    }, {});

    if (LIFT_TYPES.every(type => bests[type] == null)) return;

    const row = rowsByDateKey.get(meet.date) ?? { dateKey: meet.date, date: `${meet.date}T12:00:00.000Z` };
    row.isMeet = true;
    LIFT_TYPES.forEach(type => {
      if (bests[type] != null) row[`${type}Meet`] = bests[type];
    });
    rowsByDateKey.set(meet.date, row);
  });

  const formattedData = Array.from(rowsByDateKey.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map(row => ({
      ...row,
      displayDate: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row = payload[0].payload;
    const trainingEntries = payload.filter((e: any) => !String(e.dataKey).endsWith('Meet') && e.value != null);
    const meetEntries = payload.filter((e: any) => String(e.dataKey).endsWith('Meet') && e.value != null);
    if (trainingEntries.length === 0 && meetEntries.length === 0) return null;

    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-semibold mb-1">{row.isMeet ? 'Meet — ' : 'Week of '}{row.displayDate}</p>
        {row.cycle != null && (
          <p className="text-xs text-gray-400 mb-2">Cycle {row.cycle}, Week {row.week}</p>
        )}
        {trainingEntries.map((entry: any, index: number) => {
          const liftDate = entry.payload[`${entry.dataKey}_date`];
          const formattedDate = liftDate ? new Date(liftDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}: {Math.round(entry.value)} {unitPreference}</span>
              {formattedDate && <span className="text-xs text-gray-400">({formattedDate})</span>}
            </div>
          );
        })}
        {meetEntries.length > 0 && (
          <div className={trainingEntries.length > 0 ? 'mt-1.5 pt-1.5 border-t border-gray-700 space-y-0.5' : 'space-y-0.5'}>
            {meetEntries.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span aria-hidden="true">★</span>
                <span>{entry.name}: {Math.round(entry.value)} {unitPreference}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="displayDate"
            label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: textColor, fontWeight: 500 } }}
            tick={{ fontSize: 11, fill: textColor }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            label={{ value: `1RM (${unitPreference})`, angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: textColor, fontWeight: 500 } }}
            tick={{ fontSize: 11, fill: textColor }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          {chartData.map((lift) => (
            <Line
              key={lift.type}
              type="monotone"
              dataKey={lift.type}
              name={lift.name}
              stroke={lift.color}
              strokeWidth={3}
              dot={{ fill: 'white', stroke: lift.color, strokeWidth: 2.5, r: 5 }}
              activeDot={{ r: 7 }}
              animationDuration={800}
              animationEasing="ease-in-out"
              connectNulls={true}
            />
          ))}
          {chartData.map((lift) => (
            <Line
              key={`${lift.type}-meet`}
              type="monotone"
              dataKey={`${lift.type}Meet`}
              name={`${lift.name} PR`}
              stroke="none"
              dot={makeMeetDot(lift.color)}
              activeDot={{ r: 9, fill: lift.color, stroke: 'white', strokeWidth: 2 }}
              legendType="none"
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
