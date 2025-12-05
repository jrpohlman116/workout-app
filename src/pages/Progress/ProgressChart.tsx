import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  unitPreference: string;
}

export default function ProgressChart({ chartData, unitPreference }: ProgressChartProps) {
  const maxDataPoints = Math.max(...chartData.map(d => d.data.length));

  if (maxDataPoints === 0) return null;

  const getCycleWeekKey = (cycle: number, week: number) => {
    return `${cycle}-${week}`;
  };

  const allCycleWeeks = new Set<string>();
  console.log(ChartData)
  chartData.forEach(lift => {
    lift.data.forEach(point => {
      const cycleWeekKey = getCycleWeekKey(point.cycle, point.week);
      allCycleWeeks.add(cycleWeekKey);
    });
  });

  const sortedCycleWeeks = Array.from(allCycleWeeks).sort((a, b) => {
    const [cycleA, weekA] = a.split('-').map(Number);
    const [cycleB, weekB] = b.split('-').map(Number);
    if (cycleA !== cycleB) return cycleA - cycleB;
    return weekA - weekB;
  });

  const formattedData = sortedCycleWeeks.map(cycleWeekKey => {
    const [cycle, week] = cycleWeekKey.split('-').map(Number);

    let earliestDate: Date | null = null;
    const liftValues: Record<string, { value: number; date: string }> = {};

    chartData.forEach((lift) => {
      const pointsInCycleWeek = lift.data.filter(p =>
        getCycleWeekKey(p.cycle, p.week) === cycleWeekKey
      );

      if (pointsInCycleWeek.length > 0) {
        const latestPoint = pointsInCycleWeek.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];

        liftValues[lift.type] = { value: latestPoint.value, date: latestPoint.date };

        pointsInCycleWeek.forEach(point => {
          const pointDate = new Date(point.date);
          if (!earliestDate || pointDate < earliestDate) {
            earliestDate = pointDate;
          }
        });
      }
    });

    const dataPoint: any = {
      cycleWeekKey,
      cycle,
      week,
      displayDate: earliestDate ? (earliestDate as Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    };

    Object.entries(liftValues).forEach(([liftType, data]) => {
      dataPoint[liftType] = data.value;
      dataPoint[`${liftType}_date`] = data.date;
    });

    return dataPoint;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cycle = payload[0].payload.cycle;
      const week = payload[0].payload.week;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-semibold mb-1">Week of {payload[0].payload.displayDate}</p>
          <p className="text-xs text-gray-400 mb-2">Cycle {cycle}, Week {week}</p>
          {payload.map((entry: any, index: number) => {
            const liftDate = entry.payload[`${entry.dataKey}_date`];
            const formattedDate = liftDate ? new Date(liftDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}: {Math.round(entry.value)} {unitPreference}</span>
                {formattedDate && <span className="text-xs text-gray-400">({formattedDate})</span>}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayDate"
            label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280', fontWeight: 500 } }}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            label={{ value: `1RM (${unitPreference})`, angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280', fontWeight: 500 } }}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 14, paddingTop: 10 }}
            iconType="circle"
          />
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
