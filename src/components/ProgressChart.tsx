import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const maxDataPoints = Math.max(...chartData.map(d => d.data.length));

  if (maxDataPoints === 0) return null;

  const getWeekKey = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber}`;
  };

  const getWeekStartDate = (weekKey: string) => {
    const [year, week] = weekKey.split('-W').map(Number);
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay();
    const weekStart = new Date(year, 0, 1 + daysOffset);
    return weekStart;
  };

  const allWeeks = new Set<string>();
  chartData.forEach(lift => {
    lift.data.forEach(point => {
      const weekKey = getWeekKey(point.date);
      allWeeks.add(weekKey);
    });
  });
  const sortedWeeks = Array.from(allWeeks).sort();

  const formattedData = sortedWeeks.map(weekKey => {
    const weekStart = getWeekStartDate(weekKey);
    const dataPoint: any = {
      week: weekKey,
      displayDate: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    chartData.forEach((lift) => {
      const pointsInWeek = lift.data.filter(p => getWeekKey(p.date) === weekKey);
      if (pointsInWeek.length > 0) {
        const latestPoint = pointsInWeek.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        dataPoint[lift.type] = latestPoint.value;
      }
    });

    return dataPoint;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const weekKey = payload[0].payload.week;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-semibold mb-1">Week of {payload[0].payload.displayDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: {Math.round(entry.value)} {unitPreference}</span>
            </div>
          ))}
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
