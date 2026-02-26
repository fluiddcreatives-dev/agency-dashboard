'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Client } from '@/lib/types';
import { getMonthlyNRR, formatCurrency } from '@/lib/metrics';

interface Props {
  clients: Client[];
}

function nrrColor(nrr: number): string {
  if (nrr >= 100) return '#10b981'; // green
  if (nrr >= 85) return '#f59e0b';  // amber
  return '#ef4444';                  // red
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: { nrr: number };
}

function CustomDot({ cx, cy, payload }: DotProps) {
  if (!payload || payload.nrr < 0 || cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={nrrColor(payload.nrr)}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

interface TooltipPayload {
  payload?: { nrr: number; retainedMRR: number; previousMRR: number };
  label?: string;
}

function CustomTooltip({ payload, label }: { payload?: TooltipPayload[]; label?: string }) {
  const d = payload?.[0]?.payload;
  if (!d || d.nrr < 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-gray-500">
        NRR: <span className="font-bold" style={{ color: nrrColor(d.nrr) }}>{d.nrr}%</span>
      </p>
      <p className="text-gray-400">
        {formatCurrency(d.retainedMRR)} retained of {formatCurrency(d.previousMRR)}
      </p>
    </div>
  );
}

export default function NRRChart({ clients }: Props) {
  const raw = getMonthlyNRR(clients);
  // Only plot months that have prior-month data
  const data = raw.map((d) => ({ ...d, nrrPlot: d.nrr >= 0 ? d.nrr : null }));
  const hasData = data.some((d) => d.nrr >= 0);

  // Latest valid NRR for summary
  const latest = [...raw].reverse().find((d) => d.nrr >= 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Monthly NRR</h3>
        {latest && (
          <span
            className="text-sm font-bold"
            style={{ color: nrrColor(latest.nrr) }}
          >
            {latest.nrr}% this month
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        % of prior month MRR retained — 100% = no churn
      </p>

      {!hasData ? (
        <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
          Need at least 2 months of data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[
                (min: number) => Math.max(0, Math.floor(min - 10)),
                (max: number) => Math.min(110, Math.ceil(max + 5)),
              ]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <ReferenceLine
              y={100}
              stroke="#d1d5db"
              strokeDasharray="4 4"
              label={{ value: '100%', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="nrrPlot"
              stroke="#6366f1"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
