import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ChartDataPoint {
  value: number;
  date: string;
  cycle: number;
  week: number;
}

interface LiftData {
  type: string;
  name: string;
  color: string;
  data: ChartDataPoint[];
}

interface AccessibleChartTableProps {
  chartData: LiftData[];
  unitPreference: string;
}

export default function AccessibleChartTable({
  chartData,
  unitPreference
}: AccessibleChartTableProps) {
  const [expandedLift, setExpandedLift] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'date' | 'value'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-gray-600">
        No data available
      </div>
    );
  }

  const handleSort = (column: 'date' | 'value') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedData = (data: ChartDataPoint[]) => {
    return [...data].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortColumn === 'date') {
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      return multiplier * (a.value - b.value);
    });
  };

  const getSummaryStats = (data: ChartDataPoint[]) => {
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const changePercent = first > 0 ? ((change / first) * 100).toFixed(1) : '0.0';

    return { min, max, avg, first, last, change, changePercent };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Progress Data Table
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Alternative view of chart data with sorting and statistics
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {chartData.map((lift) => {
          const isExpanded = expandedLift === lift.type;
          const stats = getSummaryStats(lift.data);
          const sortedData = getSortedData(lift.data);

          return (
            <div key={lift.type} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedLift(isExpanded ? null : lift.type)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded={isExpanded}
                aria-controls={`table-${lift.type}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: lift.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{lift.name}</h4>
                      {stats && (
                        <p className="text-sm text-gray-600 mt-1">
                          {lift.data.length} sessions •
                          Avg: {stats.avg} {unitPreference} •
                          <span className={stats.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {stats.change >= 0 ? '+' : ''}{stats.change} {unitPreference}
                            ({stats.changePercent}%)
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div
                  id={`table-${lift.type}`}
                  className="px-6 pb-6 animate-slide-in-bottom"
                >
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Starting</p>
                        <p className="text-lg font-bold text-gray-900">{stats.first} {unitPreference}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Current</p>
                        <p className="text-lg font-bold text-gray-900">{stats.last} {unitPreference}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Best</p>
                        <p className="text-lg font-bold text-gray-900">{stats.max} {unitPreference}</p>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        {lift.name} progress data showing date, cycle, week, and estimated 1RM
                      </caption>
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left">
                            <button
                              onClick={() => handleSort('date')}
                              className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1 focus:outline-none focus:underline"
                              aria-sort={sortColumn === 'date' ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}
                            >
                              Date
                              {sortColumn === 'date' && (
                                <span aria-hidden="true">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                          <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                            Cycle
                          </th>
                          <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">
                            Week
                          </th>
                          <th scope="col" className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleSort('value')}
                              className="font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1 ml-auto focus:outline-none focus:underline"
                              aria-sort={sortColumn === 'value' ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}
                            >
                              Est. 1RM ({unitPreference})
                              {sortColumn === 'value' && (
                                <span aria-hidden="true">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedData.map((dataPoint, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-700">
                              {new Date(dataPoint.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{dataPoint.cycle}</td>
                            <td className="px-4 py-3 text-gray-700">{dataPoint.week}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {Math.round(dataPoint.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sortedData.length === 0 && (
                    <p className="text-center text-gray-600 py-8">
                      No data available for {lift.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
