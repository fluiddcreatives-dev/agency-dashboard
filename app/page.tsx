'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import {
  formatCurrency,
  formatMonths,
  recurringOnly,
  getMonthDashboardMetrics,
} from '@/lib/metrics';
import MetricCard from '@/components/dashboard/MetricCard';
import MRRGrowthChart from '@/components/dashboard/MRRGrowthChart';
import MonthlyChurnChart from '@/components/dashboard/MonthlyChurnChart';
import NRRChart from '@/components/dashboard/NRRChart';
import StatusBadge from '@/components/clients/StatusBadge';
import MigrateLocalData from '@/components/MigrateLocalData';

function advanceMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { clients, loaded } = useClients();
  const recurring = useMemo(() => recurringOnly(clients), [clients]);

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Build month list from earliest client → current month
  const months = useMemo(() => {
    if (recurring.length === 0) return [currentMonth];
    const earliest = recurring.map((c) => c.startDate.slice(0, 7)).sort()[0];
    const list: string[] = [];
    let m = earliest;
    while (m <= currentMonth) {
      list.push(m);
      m = advanceMonth(m);
    }
    return list.reverse(); // most recent first
  }, [recurring, currentMonth]);

  const metrics = useMemo(
    () => getMonthDashboardMetrics(recurring, selectedMonth),
    [recurring, selectedMonth]
  );

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    );
  }

  const selectedLabel = new Date(selectedMonth + '-02').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const addedMrrDisplay =
    metrics.addedMrr > 0
      ? `+${formatCurrency(metrics.addedMrr)}`
      : metrics.addedMrr < 0
      ? `-${formatCurrency(Math.abs(metrics.addedMrr))}`
      : formatCurrency(0);

  const recentClients = [...recurring]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <MigrateLocalData />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{selectedLabel}</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(m + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Row 1: Active Clients | Current MRR | Churned % | Added MRR */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Active Clients"
          value={metrics.activeCount.toString()}
          sub={`As of ${selectedLabel}`}
          accent="green"
        />
        <MetricCard
          label="Current MRR"
          value={formatCurrency(metrics.mrr)}
          sub="Monthly recurring revenue"
          accent="indigo"
        />
        <MetricCard
          label="Churned Clients"
          value={`${metrics.churnRate.toFixed(1)}%`}
          sub={`${metrics.churnedCount} client${metrics.churnedCount !== 1 ? 's' : ''} lost`}
          accent={metrics.churnRate > 10 ? 'red' : metrics.churnRate > 0 ? 'yellow' : 'gray'}
        />
        <MetricCard
          label="Added MRR"
          value={addedMrrDisplay}
          sub={`+${formatCurrency(metrics.newMrr)} new · −${formatCurrency(metrics.churnedMrr)} churned`}
          accent={metrics.addedMrr > 0 ? 'green' : metrics.addedMrr < 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Row 2: Avg Retention | Avg LTV | Avg Client Spend */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Avg Retention"
          value={formatMonths(metrics.avgRetention)}
          sub="Average client lifespan"
          accent="gray"
        />
        <MetricCard
          label="Average LTV"
          value={formatCurrency(metrics.avgLtv)}
          sub="Lifetime value"
          accent="green"
        />
        <MetricCard
          label="Avg Client Spend"
          value={formatCurrency(metrics.avgSpend)}
          sub="Per active client / month"
          accent="indigo"
        />
      </div>

      {/* Churned / New client breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Churned / Paused */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Churned / Paused — {selectedLabel}
          </h3>
          {metrics.churnedClients.length === 0 ? (
            <p className="text-sm text-gray-400">No churned clients this month</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {metrics.churnedClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-500">
                    −{formatCurrency(c.monthlySpend)}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between pt-3 mt-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-sm font-bold text-red-600">
                  −{formatCurrency(metrics.churnedMrr)}
                </span>
              </li>
            </ul>
          )}
        </div>

        {/* New clients */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            New Clients — {selectedLabel}
          </h3>
          {metrics.newClients.length === 0 ? (
            <p className="text-sm text-gray-400">No new clients this month</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {metrics.newClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(c.monthlySpend)}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between pt-3 mt-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-sm font-bold text-green-700">
                  +{formatCurrency(metrics.newMrr)}
                </span>
              </li>
            </ul>
          )}
        </div>
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
