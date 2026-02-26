'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Client } from '@/lib/types';
import { formatCurrency } from '@/lib/metrics';

interface Props {
  clients: Client[];
}

export default function MRRChart({ clients }: Props) {
  const active = clients
    .filter((c) => c.status === 'active' && c.monthlySpend > 0)
    .sort((a, b) => b.monthlySpend - a.monthlySpend)
    .slice(0, 10);

  if (active.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">MRR by Client</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No active clients yet
        </div>
      </div>
    );
  }

  const data = active.map((c) => ({ name: c.name, spend: c.monthlySpend }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">MRR by Client</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 32, top: 0, bottom: 0 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Monthly Spend']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#6366f1' : '#a5b4fc'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
