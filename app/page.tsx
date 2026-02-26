'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import { computeMetrics, formatCurrency, formatMonths, recurringOnly } from '@/lib/metrics';
import MetricCard from '@/components/dashboard/MetricCard';
import MRRGrowthChart from '@/components/dashboard/MRRGrowthChart';
import MonthlyChurnChart from '@/components/dashboard/MonthlyChurnChart';
import NRRChart from '@/components/dashboard/NRRChart';
import StatusBadge from '@/components/clients/StatusBadge';
import MigrateLocalData from '@/components/MigrateLocalData';

export default function DashboardPage() {
  const { clients, loaded } = useClients();
  const recurring = useMemo(() => recurringOnly(clients), [clients]);
  const metrics = useMemo(() => computeMetrics(recurring), [recurring]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    );
  }

  const recentClients = [...recurring]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <MigrateLocalData />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Active Clients"
          value={metrics.activeClients.toString()}
          sub={metrics.pausedClients > 0 ? `${metrics.pausedClients} paused` : undefined}
          accent="green"
        />
        <MetricCard
          label="MRR"
          value={formatCurrency(metrics.mrr)}
          sub="Monthly recurring revenue"
          accent="indigo"
        />
        <MetricCard
          label="Avg Client Spend"
          value={formatCurrency(metrics.avgMonthlySpend)}
          sub="Per active client / month"
          accent="indigo"
        />
        <MetricCard
          label="Avg Client LTV"
          value={formatCurrency(metrics.avgLtv)}
          sub="Lifetime value"
          accent="green"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Churned Clients"
          value={metrics.churnedClients.toString()}
          sub={`Churn rate ${metrics.churnRate.toFixed(1)}%`}
          accent={metrics.churnRate > 20 ? 'red' : 'yellow'}
        />
        <MetricCard
          label="Avg Retention"
          value={formatMonths(metrics.avgRetentionMonths)}
          sub="Average client lifespan"
          accent="gray"
        />
        <MetricCard
          label="Total Clients"
          value={(
            metrics.activeClients +
            metrics.pausedClients +
            metrics.churnedClients
          ).toString()}
          sub="All time"
          accent="gray"
        />
      </div>

      {/* MRR Growth — full width */}
      <MRRGrowthChart clients={recurring} />

      {/* Monthly Churn + NRR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyChurnChart clients={recurring} />
        <NRRChart clients={recurring} />
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Recent Clients</h3>
          <Link
            href="/clients"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View all →
          </Link>
        </div>
        {recentClients.length === 0 ? (
          <div className="h-24 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <p>No clients yet</p>
            <Link href="/clients" className="text-indigo-600 hover:underline text-xs">
              Add your first client →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {recentClients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="flex flex-col gap-1 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors border border-gray-50 hover:border-gray-100"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(c.monthlySpend)}/mo</p>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
