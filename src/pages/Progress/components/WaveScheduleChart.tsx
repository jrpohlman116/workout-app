import { useState } from 'react';
import { Info } from 'lucide-react';
import IconButton from '../../../components/ui/IconButton';
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
import type { WaveSchedule, RepWave, WavePhase } from '../../../lib/calculations';
import { calculateJuggernautSets, calculatePeakingSets, getRoundingIncrement } from '../../../lib/calculations';
import { PHASE_LABELS, PHASE_ABBR, MEET_WEEK_TM_PCT } from '../../../lib/constants';

interface TrainingMaxes {
  squat: number;
  bench: number;
  deadlift: number;
}

interface WaveScheduleChartProps {
  schedule: WaveSchedule;
  trainingMaxes: TrainingMaxes;
  unit: string;
}

const WAVE_COLORS: Record<number, string> = {
  10: '#0ea5e9', // sky-500
  8:  '#2563eb', // blue-600
  5:  '#4f46e5', // indigo-600
  3:  '#7c3aed', // violet-600
};

const WAVE_MUTED: Record<number, string> = {
  10: '#bae6fd', // sky-200
  8:  '#bfdbfe', // blue-200
  5:  '#c7d2fe', // indigo-200
  3:  '#ddd6fe', // violet-200
};

const PEAKING_COLOR = '#f59e0b';      // amber-400
const PEAKING_MUTED = '#fde68a';      // amber-200
const MEET_WEEK_COLOR = '#10b981';    // emerald-500


interface BarDatum {
  label: string;
  wave: number;
  phase: WavePhase;
  peakWeek?: number;
  totalReps: number;
  intensityPct: number;
  squatWeight: number;
  benchWeight: number;
  deadliftWeight: number;
  numSets: number;
  reps: number;
  isAmap: boolean;
  isCurrentWeek: boolean;
  isPast: boolean;
  isPeaking: boolean;
  isMeetWeek: boolean;
}

export default function WaveScheduleChart({ schedule, trainingMaxes, unit }: WaveScheduleChartProps) {
  const [showInfo, setShowInfo] = useState(false);

  if (!schedule.weeks.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {schedule.adjustments.length
            ? schedule.adjustments[0]
            : 'Set a meet date in your profile to see your program schedule.'}
        </p>
      </div>
    );
  }

  const now = Date.now();

  const getWeightForMax = (tm: number, isPeaking: boolean, isMeetWeek: boolean, block: typeof schedule.weeks[0]) => {
    const roundTo = getRoundingIncrement(unit);
    if (isPeaking) return calculatePeakingSets(block.peakWeek ?? 1, block.totalPeakWeeks ?? 3, tm, unit).weight;
    if (isMeetWeek) return Math.round(tm * MEET_WEEK_TM_PCT / roundTo) * roundTo;
    return calculateJuggernautSets(block.wave as RepWave, block.phase, tm, unit).weight;
  };

  const data: BarDatum[] = schedule.weeks.map(block => {
    const isPeaking = block.phase === 'peaking';
    const isMeetWeek = block.phase === 'meet_week';
    const isCurrentWeek = block.startDate.getTime() <= now && block.endDate.getTime() >= now;
    const isPast = block.endDate.getTime() < now;

    let cfg;
    if (isPeaking) {
      cfg = calculatePeakingSets(block.peakWeek ?? 1, block.totalPeakWeeks ?? 3, trainingMaxes.squat, unit);
    } else if (isMeetWeek) {
      const roundTo = getRoundingIncrement(unit);
      cfg = { numSets: 1, reps: 1, weight: Math.round(trainingMaxes.squat * MEET_WEEK_TM_PCT / roundTo) * roundTo, isAmap: false };
    } else {
      cfg = calculateJuggernautSets(block.wave as RepWave, block.phase, trainingMaxes.squat, unit);
    }

    const totalReps = cfg.numSets * cfg.reps;
    const intensityPct = trainingMaxes.squat > 0 ? Math.round((cfg.weight / trainingMaxes.squat) * 100) : 0;
    const abbr = isPeaking ? `P${block.peakWeek ?? ''}` : isMeetWeek ? 'M' : `${block.wave}${PHASE_ABBR[block.phase] ?? '?'}`;

    return {
      label: abbr,
      wave: block.wave,
      phase: block.phase,
      peakWeek: block.peakWeek,
      totalReps,
      intensityPct,
      squatWeight: getWeightForMax(trainingMaxes.squat, isPeaking, isMeetWeek, block),
      benchWeight: getWeightForMax(trainingMaxes.bench, isPeaking, isMeetWeek, block),
      deadliftWeight: getWeightForMax(trainingMaxes.deadlift, isPeaking, isMeetWeek, block),
      numSets: cfg.numSets,
      reps: cfg.reps,
      isAmap: cfg.isAmap,
      isCurrentWeek,
      isPast,
      isPeaking,
      isMeetWeek,
    };
  });

  const currentDatum = data.find(d => d.isCurrentWeek);
  const pastCount = data.filter(d => d.isPast).length;
  const remainingCount = data.filter(d => !d.isPast && !d.isCurrentWeek).length;

  const getBarFill = (d: BarDatum) => {
    if (d.isMeetWeek) return MEET_WEEK_COLOR;
    if (d.isPeaking) return d.phase === 'deload' ? PEAKING_MUTED : PEAKING_COLOR;
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
    const title = d.isMeetWeek
      ? 'Meet Week'
      : d.isPeaking
        ? `Peaking — Week ${d.peakWeek} of 3`
        : `${d.wave}-Rep Wave`;
    return (
      <div className="bg-gray-900 text-white px-3 py-2.5 rounded-lg shadow-xl text-sm min-w-[168px]">
        <p className="font-bold leading-tight">{title}</p>
        <p className="text-xs text-gray-400 mb-2">{PHASE_LABELS[d.phase]}</p>
        <div className="space-y-0.5">
          {d.isMeetWeek ? (
            <p className="text-xs text-gray-400">Rest — save it for the platform</p>
          ) : d.isAmap ? (
            <p className="text-xs mb-1.5">
              1 set × {d.reps}+ reps <span className="text-gray-400">(AMAP)</span>
            </p>
          ) : (
            <p className="text-xs mb-1.5">
              {d.numSets} × {d.reps} = <span className="font-semibold">{d.totalReps} reps</span>
            </p>
          )}
          {!d.isMeetWeek && (
            <div className="space-y-0.5">
              <p className="text-xs"><span className="text-gray-400 w-14 inline-block">Squat</span><span className="font-semibold">{d.squatWeight} {unit}</span></p>
              <p className="text-xs"><span className="text-gray-400 w-14 inline-block">Bench</span><span className="font-semibold">{d.benchWeight} {unit}</span></p>
              <p className="text-xs"><span className="text-gray-400 w-14 inline-block">Deadlift</span><span className="font-semibold">{d.deadliftWeight} {unit}</span></p>
            </div>
          )}
        </div>
        {d.isCurrentWeek && (
          <p className="text-xs text-amber-400 font-semibold mt-1.5">← You are here</p>
        )}
        {d.isPast && (
          <p className="text-xs text-gray-500 mt-1.5">Completed</p>
        )}
      </div>
    );
  };

  const chartWidth = Math.max(data.length * 44, 300);

  const wavesInSchedule = [...new Set(data.filter(d => !d.isPeaking && !d.isMeetWeek).map(d => d.wave))].sort((a, b) => b - a);

  return (
    <div className="space-y-2">
      {/* Summary row */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-gray-100">{pastCount}</span> weeks done
        </span>
        {currentDatum && (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {currentDatum.isMeetWeek
              ? 'Meet Week'
              : currentDatum.isPeaking
                ? `Peaking Week ${currentDatum.peakWeek}`
                : `${currentDatum.wave}-Rep ${PHASE_LABELS[currentDatum.phase]}`}
          </span>
        )}
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-gray-100">{remainingCount}</span> weeks left
        </span>
        {schedule.adjustments.length > 0 && (
          <IconButton
            size="sm"
            label="Schedule details"
            onClick={() => setShowInfo(v => !v)}
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {showInfo && schedule.adjustments.length > 0 && (
        <div className="space-y-1">
          {schedule.adjustments.map((msg, i) => (
            <p key={i} className="text-xs text-gray-400 dark:text-gray-400">{msg}</p>
          ))}
        </div>
      )}

      {/* Chart — scrollable on narrow screens */}
      <div className="overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        <div style={{ width: chartWidth, minWidth: '100%' }}>
          <ComposedChart
            width={chartWidth}
            height={180}
            data={data}
            margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              angle={-45}
              textAnchor="end"
              height={24}
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
        {data.some(d => d.isPeaking) && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PEAKING_COLOR }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">Peaking</span>
          </div>
        )}
        {data.some(d => d.isMeetWeek) && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: MEET_WEEK_COLOR }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">Meet</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0 border-t-2 border-dashed border-gray-300 dark:border-gray-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">% TM</span>
        </div>
      </div>

    </div>
  );
}
