'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Client, ClientStatus, ClientType } from '@/lib/types';
import { formatCurrency } from '@/lib/metrics';
import StatusBadge from './StatusBadge';

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
}

function isUpsoldFlow(client: Client): boolean {
  return client.clientType === 'flow_setup' && !!client.upsold;
}

function effectiveSpend(client: Client): number {
  return isUpsoldFlow(client) ? (client.upsellMrr ?? 0) : client.monthlySpend;
}

function effectiveStart(client: Client): string {
  return isUpsoldFlow(client) && client.upsellDate ? client.upsellDate : client.startDate;
}

function clientLtv(client: Client): number {
  const end = client.endDate ?? new Date().toISOString();
  const months = Math.max(1, monthsBetween(effectiveStart(client), end));
  return effectiveSpend(client) * months;
}

type SortKey = 'monthlySpend' | 'ltv' | 'startDate';
type SortDir = 'desc' | 'asc';

interface Props {
  clients: Client[];
  onAdd: () => void;
}

const STATUS_FILTERS: { label: string; value: ClientStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Churned', value: 'churned' },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1 text-indigo-500">{dir === 'desc' ? '↓' : '↑'}</span>;
}

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
  if (qualified === true) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Qualified
      </span>
    );
  }
  if (qualified === false) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
        Not Qualified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
      N/A
    </span>
  );
}

export default function ClientTable({ clients, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType>('recurring');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('monthlySpend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const byType = clients.filter((c) => {
    const type = c.clientType ?? 'recurring';
    if (typeFilter === 'recurring') {
      // Include regular recurring clients AND upsold flow setup clients
      return type === 'recurring' || (type === 'flow_setup' && c.upsold && (c.upsellMrr ?? 0) > 0);
    }
    return type === typeFilter;
  });

  const filtered = byType
    .filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (sortKey === 'monthlySpend') {
        aVal = effectiveSpend(a);
        bVal = effectiveSpend(b);
      } else if (sortKey === 'ltv') {
        aVal = clientLtv(a);
        bVal = clientLtv(b);
      } else {
        aVal = new Date(effectiveStart(a)).getTime();
        bVal = new Date(effectiveStart(b)).getTime();
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const recurringCount = clients.filter((c) => !c.clientType || c.clientType === 'recurring').length;
  const flowCount = clients.filter((c) => c.clientType === 'flow_setup').length;

  const isFlow = typeFilter === 'flow_setup';

  return (
    <div>
      {/* Type Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTypeFilter('recurring')}
          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            !isFlow
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400'
          }`}
        >
          Recurring Clients
          <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${!isFlow ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-100 text-gray-500'}`}>
            {recurringCount}
          </span>
        </button>
        <button
          onClick={() => setTypeFilter('flow_setup')}
          className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            isFlow
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-400'
          }`}
        >
          Flow Setups
          <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${isFlow ? 'bg-orange-400 text-orange-100' : 'bg-gray-100 text-gray-500'}`}>
            {flowCount}
          </span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                statusFilter === f.value
                  ? isFlow ? 'bg-orange-500 text-white' : 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
          <button
            onClick={onAdd}
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Company</th>
              {isFlow ? (
                <>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Qualified</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Upsell</th>
                </>
              ) : (
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              )}
              <th className="text-right px-4 py-3">
                <button
                  onClick={() => handleSort('monthlySpend')}
                  className="font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {isFlow ? 'Setup Fee' : 'Monthly Revenue'}
                  <SortIcon active={sortKey === 'monthlySpend'} dir={sortDir} />
                </button>
              </th>
              {isFlow ? (
                <th className="text-right px-4 py-3 font-medium text-gray-500">Upsell MRR</th>
              ) : (
                <th className="text-right px-4 py-3">
                  <button
                    onClick={() => handleSort('ltv')}
                    className="font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    LTV
                    <SortIcon active={sortKey === 'ltv'} dir={sortDir} />
                  </button>
                </th>
              )}
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => handleSort('startDate')}
                  className="font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {isFlow ? 'Setup Date' : 'Start Date'}
                  <SortIcon active={sortKey === 'startDate'} dir={sortDir} />
                </button>
              </th>
              {!isFlow && (
                <th className="text-left px-4 py-3 font-medium text-gray-500">Churn Date</th>
              )}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isFlow ? 7 : 7} className="px-4 py-12 text-center text-gray-400">
                  {byType.length === 0
                    ? isFlow
                      ? 'No flow setups yet. Add a client and select "Flow Setup".'
                      : 'No clients yet. Add your first one!'
                    : 'No clients match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span>{client.name}</span>
                    {!isFlow && isUpsoldFlow(client) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Upsell</span>
                    )}
                  </td>
                  {isFlow ? (
                    <>
                      <td className="px-4 py-3">
                        <QualifiedBadge qualified={client.qualified} />
                      </td>
                      <td className="px-4 py-3">
                        <UpsellBadge upsold={client.upsold} />
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(effectiveSpend(client))}
                  </td>
                  {isFlow ? (
                    <td className="px-4 py-3 text-right text-gray-700">
                      {client.upsold && client.upsellMrr
                        ? <span className="text-green-700 font-medium">{formatCurrency(client.upsellMrr)}/mo</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(clientLtv(client))}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(effectiveStart(client)).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  {!isFlow && (
                    <td className="px-4 py-3 text-gray-500">
                      {client.endDate
                        ? new Date(client.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
