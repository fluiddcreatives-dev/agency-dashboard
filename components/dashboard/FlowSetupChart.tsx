'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FlowSetupMonthPoint } from '@/lib/metrics';

interface Props {
  data: FlowSetupMonthPoint[];
}

export default function FlowSetupChart({ data }: Props) {
  const hasData = data.some((d) => d.setups > 0 || d.upsells > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Setups vs Upsells</h3>
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No flow setup data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
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
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              cursor={{ fill: '#f9fafb' }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (name === 'setups') return [value ?? 0, 'Setups'];
                if (name === 'upsells') return [value ?? 0, 'Upsells'];
                return [value ?? 0, name ?? ''];
              }}
            />
            <Legend
              formatter={(value) => (value === 'setups' ? 'Setups' : 'Upsells')}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="setups" fill="#818cf8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="upsells" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
