'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Client } from '@/lib/types';
import { getMRRHistory, formatCurrency } from '@/lib/metrics';

interface Props {
  clients: Client[];
}

export default function MRRGrowthChart({ clients }: Props) {
  const data = getMRRHistory(clients);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">MRR Growth</h3>
        <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
          No data yet
        </div>
      </div>
    );
  }

  const maxMRR = Math.max(...data.map((d) => d.mrr));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">MRR Growth</h3>
        <span className="text-xs text-gray-400">All time</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => (maxMRR >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'MRR']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#mrrGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
