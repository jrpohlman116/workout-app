import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { WaveSchedule, RepWave } from '../../lib/calculations';
import { calculateJuggernautSets } from '../../lib/calculations';
import type { WorkoutSession } from '../../lib/supabase';

interface WaveScheduleChartProps {
  schedule: WaveSchedule;
  trainingMax: number;
  unit: string;
  sessions: WorkoutSession[];
}

const WAVE_COLORS: Record<number, string> = {
  10: '#3b82f6',
  8:  '#10b981',
  5:  '#8b5cf6',
  3:  '#f97316',
};

const WAVE_MUTED: Record<number, string> = {
  10: '#93c5fd',
  8:  '#6ee7b7',
  5:  '#c4b5fd',
  3:  '#fdba74',
};

const PHASE_LABELS: Record<string, string> = {
  accumulation:    'Accumulation',
  intensification: 'Intensification',
  realization:     'Realization',
  deload:          'Deload',
};

const PHASE_ABBR: Record<string, string> = {
  accumulation:    'A',
  intensification: 'I',
  realization:     'R',
  deload:          'D',
};

interface BarDatum {
  label: string;
  wave: number;
  phase: string;
  totalReps: number;
  intensityPct: number;
  weight: number;
  numSets: number;
  reps: number;
  isAmap: boolean;
  isCurrentWeek: boolean;
  isPast: boolean;
}

export default function WaveScheduleChart({ schedule, trainingMax, unit, sessions }: WaveScheduleChartProps) {
  if (!schedule.weeks.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set a meet date in your profile to see your program schedule.
        </p>
      </div>
    );
  }

  const now = Date.now();

  const data: BarDatum[] = schedule.weeks.map(block => {
    const cfg = calculateJuggernautSets(block.wave as RepWave, block.phase, trainingMax, unit);
    const totalReps = cfg.numSets * cfg.reps;
    const intensityPct = trainingMax > 0 ? Math.round((cfg.weight / trainingMax) * 100) : 0;
    const isCurrentWeek = block.startDate.getTime() <= now && block.endDate.getTime() >= now;
    const isPast = block.endDate.getTime() < now;

    return {
      label: `${block.wave}${PHASE_ABBR[block.phase] ?? '?'}`,
      wave: block.wave,
      phase: block.phase,
      totalReps,
      intensityPct,
      weight: cfg.weight,
      numSets: cfg.numSets,
      reps: cfg.reps,
      isAmap: cfg.isAmap,
      isCurrentWeek,
      isPast,
    };
  });

  const currentDatum = data.find(d => d.isCurrentWeek);
  const pastCount = data.filter(d => d.isPast).length;
  const remainingCount = data.filter(d => !d.isPast && !d.isCurrentWeek).length;

  const getBarFill = (d: BarDatum) => {
    if (d.phase === 'deload') return WAVE_MUTED[d.wave] ?? '#e5e7eb';
    return WAVE_COLORS[d.wave] ?? '#6b7280';
  };

  const getBarOpacity = (d: BarDatum) => {
    if (d.isCurrentWeek) return 1;
    if (d.isPast) return 0.3;
    return 0.8;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d: BarDatum = payload[0].payload;
    return (
      <div className="bg-gray-900 text-white px-3 py-2.5 rounded-lg shadow-xl text-sm min-w-[168px]">
        <p className="font-bold leading-tight">{d.wave}-Rep Wave</p>
        <p className="text-xs text-gray-400 mb-2">{PHASE_LABELS[d.phase]}</p>
        <div className="space-y-0.5">
          {d.isAmap ? (
            <p className="text-xs">
              1 set × {d.reps}+ reps <span className="text-gray-400">(AMAP)</span>
            </p>
          ) : (
            <p className="text-xs">
              {d.numSets} × {d.reps} = <span className="font-semibold">{d.totalReps} reps</span>
            </p>
          )}
          <p className="text-xs">
            {d.weight} {unit}{' '}
            <span className="text-gray-400">({d.intensityPct}% TM)</span>
          </p>
        </div>
        {d.isCurrentWeek && (
          <p className="text-xs text-blue-400 font-semibold mt-1.5">← You are here</p>
        )}
        {d.isPast && (
          <p className="text-xs text-gray-500 mt-1.5">Completed</p>
        )}
      </div>
    );
  };

  const chartWidth = Math.max(data.length * 44, 300);

  const wavesInSchedule = [...new Set(data.map(d => d.wave))].sort((a, b) => b - a);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-gray-100">{pastCount}</span> weeks done
        </span>
        {currentDatum && (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {currentDatum.wave}-Rep {PHASE_LABELS[currentDatum.phase]}
          </span>
        )}
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-gray-100">{remainingCount}</span> weeks left
        </span>
      </div>

      {/* Chart — scrollable on narrow screens */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ width: chartWidth, minWidth: '100%' }}>
          <ComposedChart
            width={chartWidth}
            height={256}
            data={data}
            margin={{ top: 8, right: 38, left: 0, bottom: 48 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              angle={-45}
              textAnchor="end"
              height={52}
              interval={0}
            />
            <YAxis
              yAxisId="reps"
              orientation="left"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              width={28}
              tickCount={5}
              label={{
                value: 'Reps',
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                style: { fontSize: 9, fill: '#9ca3af' },
              }}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              width={38}
              tickCount={5}
              label={{
                value: '% TM',
                angle: 90,
                position: 'insideRight',
                offset: 10,
                style: { fontSize: 9, fill: '#9ca3af' },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

            {currentDatum && (
              <ReferenceLine
                yAxisId="reps"
                x={currentDatum.label}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            )}

            <Bar yAxisId="reps" dataKey="totalReps" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((d, i) => (
                <Cell key={i} fill={getBarFill(d)} fillOpacity={getBarOpacity(d)} />
              ))}
            </Bar>

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="intensityPct"
              stroke="#d1d5db"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 3"
              activeDot={{ r: 3, fill: '#9ca3af' }}
            />
          </ComposedChart>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
        {wavesInSchedule.map(wave => (
          <div key={wave} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: WAVE_COLORS[wave] }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{wave}-Rep</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0 border-t-2 border-dashed border-gray-300 dark:border-gray-600" />
          <span className="text-xs text-gray-500 dark:text-gray-400">% TM</span>
        </div>
      </div>

      {schedule.adjustments.length > 0 && (
        <div className="space-y-1 pt-1">
          {schedule.adjustments.map((msg, i) => (
            <p key={i} className="text-xs text-gray-400 dark:text-gray-500">{msg}</p>
          ))}
        </div>
      )}
    </div>
  );
}
