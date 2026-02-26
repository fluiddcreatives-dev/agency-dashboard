'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import { getFlowSetupMonthlyMetrics, formatCurrency } from '@/lib/metrics';
import FlowSetupChart from '@/components/dashboard/FlowSetupChart';

function UpsellBadge({ upsold }: { upsold?: boolean }) {
  if (upsold) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        ✓ Upsold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Not yet
    </span>
  );
}

function QualifiedBadge({ qualified }: { qualified?: boolean }) {
  if (qualified === true)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Qualified</span>;
  if (qualified === false)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Not Qualified</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">N/A</span>;
}

function StatCard({
  label,
  value,
  sub,
  color = 'gray',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'gray' | 'green' | 'red' | 'indigo' | 'yellow';
}) {
  const colors = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    red: 'text-red-500',
    indigo: 'text-indigo-600',
    yellow: 'text-yellow-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

type QualFilter = 'all' | 'qualified' | 'not_qualified';

export default function FlowSetupsPage() {
  const { clients, loaded } = useClients();
  const [qualFilter, setQualFilter] = useState<QualFilter>('all');

  const flowClients = useMemo(
    () => clients.filter((c) => c.clientType === 'flow_setup'),
    [clients]
  );

  const filteredFlowClients = useMemo(() => {
    if (qualFilter === 'qualified') return flowClients.filter((c) => c.qualified === true);
    if (qualFilter === 'not_qualified') return flowClients.filter((c) => c.qualified === false);
    return flowClients;
  }, [flowClients, qualFilter]);

  const monthly = useMemo(() => getFlowSetupMonthlyMetrics(clients), [clients]);

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Selected month data from metrics
  const monthData = monthly.find((m) => m.month === selectedMonth) ?? {
    setups: 0, qualified: 0, unqualified: 0, upsells: 0, upsellRate: 0, newMrr: 0,
  };

  // Clients set up in selected month
  const monthSetupClients = flowClients.filter(
    (c) => c.startDate.slice(0, 7) === selectedMonth
  );
  // Clients that upselled this month but were set up in a prior month
  const priorUpsellClients = flowClients.filter(
    (c) => c.upsold && c.upsellDate?.slice(0, 7) === selectedMonth && c.startDate.slice(0, 7) !== selectedMonth
  );

  // Chart: 2026 full year
  const chartData = monthly.filter((m) => m.month >= '2026-01' && m.month <= '2026-12');

  // Dropdown label for selected month
  const selectedLabel = new Date(selectedMonth + '-02').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (!loaded) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header with month dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flow Setups</h1>
          <p className="text-sm text-gray-500 mt-1">One-time brand setup tracking & upsell conversions</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        >
          {/* Always include current month */}
          {!monthly.find((m) => m.month === currentMonth) && (
            <option value={currentMonth}>{new Date(currentMonth + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>
          )}
          {[...monthly].reverse().map((m) => (
            <option key={m.month} value={m.month}>
              {new Date(m.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Metric cards — all driven by selectedMonth */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Setups"
          value={monthData.setups.toString()}
          sub={selectedLabel}
          color="indigo"
        />
        <StatCard
          label="Qualified"
          value={monthData.qualified.toString()}
          sub={monthData.setups > 0 ? `${((monthData.qualified / monthData.setups) * 100).toFixed(0)}% of setups` : 'No setups'}
          color="green"
        />
        <StatCard
          label="Not Qualified"
          value={monthData.unqualified.toString()}
          sub={`${monthData.setups - monthData.qualified - monthData.unqualified} unassessed`}
          color={monthData.unqualified > monthData.qualified ? 'red' : 'gray'}
        />
        <StatCard
          label="Qualification Rate"
          value={monthData.setups > 0 ? `${((monthData.qualified / monthData.setups) * 100).toFixed(1)}%` : '—'}
          sub="Qualified / total setups"
          color={monthData.qualified / Math.max(monthData.setups, 1) >= 0.5 ? 'green' : monthData.setups > 0 ? 'yellow' : 'gray'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Upsells"
          value={monthData.upsells.toString()}
          sub="Converted to recurring"
          color={monthData.upsells > 0 ? 'green' : 'gray'}
        />
        <StatCard
          label="Upsell Rate"
          value={monthData.setups > 0 ? `${monthData.upsellRate.toFixed(1)}%` : '—'}
          sub="Upsells / setups"
          color={monthData.upsellRate >= 30 ? 'green' : monthData.upsellRate > 0 ? 'yellow' : 'gray'}
        />
        <StatCard
          label="New MRR Added"
          value={monthData.newMrr > 0 ? formatCurrency(monthData.newMrr) : '$0'}
          sub="From upsells this month"
          color={monthData.newMrr > 0 ? 'green' : 'gray'}
        />
      </div>

      {/* Chart — current year */}
      <FlowSetupChart data={chartData} />

      {/* Setups in selected month */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Setups in {selectedLabel}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{monthSetupClients.length} setup{monthSetupClients.length !== 1 ? 's' : ''}</p>
        </div>
        {monthSetupClients.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No setups recorded for {selectedLabel}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Company</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Qualified</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Upsell</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Setup Fee</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Upsell MRR</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {monthSetupClients.map((client) => (
                <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-5 py-3"><QualifiedBadge qualified={client.qualified} /></td>
                  <td className="px-5 py-3"><UpsellBadge upsold={client.upsold} /></td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(client.monthlySpend)}</td>
                  <td className="px-5 py-3 text-right">
                    {client.upsold && client.upsellMrr
                      ? <span className="text-green-600 font-medium">{formatCurrency(client.upsellMrr)}/mo</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Prior setups that upsold this month */}
      {priorUpsellClients.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Upsells Converted in {selectedLabel}</h3>
            <p className="text-xs text-gray-400 mt-0.5">From prior months' setups</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Company</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Setup Date</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Upsell MRR</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {priorUpsellClients.map((client) => (
                <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(client.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {client.upsellMrr
                      ? <span className="text-green-600 font-medium">{formatCurrency(client.upsellMrr)}/mo</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Time to Launch tracker */}
      {flowClients.some((c) => c.onboardingDate) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Time to Launch</h3>
            <p className="text-xs text-gray-400 mt-0.5">Onboarding start → Flows live</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Company</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Onboarding</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Flows Live</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Days to Launch</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {flowClients
                .filter((c) => c.onboardingDate)
                .sort((a, b) => new Date(b.onboardingDate!).getTime() - new Date(a.onboardingDate!).getTime())
                .map((client) => {
                  const start = client.onboardingDate ? new Date(client.onboardingDate) : null;
                  const end = client.flowsLiveDate ? new Date(client.flowsLiveDate) : null;
                  const days = start && end
                    ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const inProgress = start && !end;
                  const daysSoFar = start && !end
                    ? Math.round((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{client.name}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {end ? end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-gray-300">Not yet</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {days !== null
                          ? <span className={days <= 14 ? 'text-green-600' : days <= 30 ? 'text-yellow-600' : 'text-red-500'}>{days}d</span>
                          : inProgress
                            ? <span className="text-indigo-500">{daysSoFar}d so far</span>
                            : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {end
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Live</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">In Progress</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">View →</Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {/* Avg time to launch summary */}
          {flowClients.some((c) => c.onboardingDate && c.flowsLiveDate) && (() => {
            const completed = flowClients.filter((c) => c.onboardingDate && c.flowsLiveDate);
            const avg = completed.reduce((sum, c) => {
              const d = Math.round((new Date(c.flowsLiveDate!).getTime() - new Date(c.onboardingDate!).getTime()) / (1000 * 60 * 60 * 24));
              return sum + d;
            }, 0) / completed.length;
            return (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-1 text-xs text-gray-500">
                <span>Avg time to launch:</span>
                <span className="font-semibold text-gray-700">{Math.round(avg)} days</span>
                <span className="text-gray-400">across {completed.length} completed setup{completed.length !== 1 ? 's' : ''}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* All Flow Setup Clients */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">All Flow Setup Clients</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filteredFlowClients.length} of {flowClients.length} total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {(['all', 'qualified', 'not_qualified'] as QualFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setQualFilter(f)}
                  className={`px-3 py-1.5 transition-colors ${
                    qualFilter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'qualified' ? 'Qualified' : 'Not Qualified'}
                </button>
              ))}
            </div>
            <Link href="/clients" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Manage clients →
            </Link>
          </div>
        </div>
        {flowClients.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-400 text-sm mb-2">No flow setup clients yet.</p>
            <Link href="/clients" className="text-xs text-indigo-600 hover:underline">
              Add a client and select "Flow Setup" →
            </Link>
          </div>
        ) : filteredFlowClients.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No clients match this filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Company</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Qualified</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Upsell</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Setup Fee</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Upsell MRR</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Setup Date</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Upsell Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredFlowClients
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map((client) => (
                  <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{client.name}</td>
                    <td className="px-5 py-3"><QualifiedBadge qualified={client.qualified} /></td>
                    <td className="px-5 py-3"><UpsellBadge upsold={client.upsold} /></td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(client.monthlySpend)}</td>
                    <td className="px-5 py-3 text-right">
                      {client.upsold && client.upsellMrr
                        ? <span className="text-green-600 font-medium">{formatCurrency(client.upsellMrr)}/mo</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(client.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {client.upsellDate
                        ? new Date(client.upsellDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/clients/${client.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">View →</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
