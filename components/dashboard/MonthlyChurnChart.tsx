'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Client } from '@/lib/types';
import { getMonthlyChurn } from '@/lib/metrics';

interface Props {
  clients: Client[];
}

export default function MonthlyChurnChart({ clients }: Props) {
  const data = getMonthlyChurn(clients);
  const hasAnyChurn = data.some((d) => d.churned > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Monthly Churn</h3>
        <span className="text-xs text-gray-400">Last 12 months</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">Clients lost per month</p>

      {!hasAnyChurn ? (
        <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
          No churn recorded yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              formatter={(value: number | undefined) => {
                const v = value ?? 0;
                return [`${v} client${v !== 1 ? 's' : ''}`, 'Churned'];
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
            />
            <Bar dataKey="churned" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.churned > 0 ? '#f87171' : '#f3f4f6'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Monthly churn rate summary */}
      {hasAnyChurn && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-x-4 gap-y-1">
          {data
            .filter((d) => d.churned > 0)
            .slice(-4)
            .map((d) => (
              <div key={d.month} className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{d.label}</span>
                {' — '}
                {d.churned} lost · {d.churnRate}% rate
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
