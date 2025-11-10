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

  const allDates = new Set<string>();
  chartData.forEach(lift => {
    lift.data.forEach(point => {
      const dateOnly = point.date.split('T')[0];
      allDates.add(dateOnly);
    });
  });
  const sortedDates = Array.from(allDates).sort();

  const formattedData = sortedDates.map(date => {
    const dataPoint: any = {
      date,
      displayDate: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    chartData.forEach((lift) => {
      const point = lift.data.find(p => p.date.split('T')[0] === date);
      if (point) {
        dataPoint[lift.type] = point.value;
      }
    });

    return dataPoint;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const fullDate = new Date(payload[0].payload.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-semibold mb-1">{fullDate}</p>
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
