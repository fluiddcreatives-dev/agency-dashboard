'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import { Client } from '@/lib/types';
import { formatCurrency, computeClientLtv } from '@/lib/metrics';
import StatusBadge from '@/components/clients/StatusBadge';
import ClientForm from '@/components/clients/ClientForm';

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { clients, loaded, updateClient, deleteClient, markChurned, addMrrChange } = useClients();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMrrForm, setShowMrrForm] = useState(false);
  const [newMrr, setNewMrr] = useState('');
  const [mrrDate, setMrrDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingMrr, setSavingMrr] = useState(false);

  if (!loaded) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400 mb-4">Client not found.</p>
        <Link href="/clients" className="text-indigo-600 hover:underline text-sm">
          ← Back to clients
        </Link>
      </div>
    );
  }

  const ltv = computeClientLtv(client);

  async function handleMrrSave() {
    const amount = Number(newMrr);
    if (!amount || amount <= 0) return;
    setSavingMrr(true);
    await addMrrChange(client!.id, client!.monthlySpend, amount, mrrDate);
    await updateClient({ ...client!, monthlySpend: amount });
    setShowMrrForm(false);
    setNewMrr('');
    setSavingMrr(false);
  }

  function handleSave(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    updateClient({
      ...data,
      id: client!.id,
      createdAt: client!.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleDelete() {
    deleteClient(client!.id);
    router.push('/clients');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
        ← Back to clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={client.status} />
            <span className="text-sm text-gray-500">
              Since{' '}
              {new Date(client.startDate).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.status === 'active' && (
            <button
              onClick={() => markChurned(client.id)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Mark Churned
            </button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs text-red-600 font-medium">Confirm?</span>
              <button onClick={handleDelete} className="text-xs text-red-700 font-bold hover:underline">
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      <ClientForm client={client} inline onSave={handleSave} onCancel={() => {}} />

      {/* Metrics */}
      {client.clientType === 'flow_setup' ? (
        // Flow Setup metrics
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Setup Fee</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(client.monthlySpend)}</p>
            <p className="text-xs text-gray-400 mt-0.5">One-time</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Qualified</p>
            {client.qualified === true && <p className="text-xl font-bold text-green-600">Qualified</p>}
            {client.qualified === false && <p className="text-xl font-bold text-red-500">Not Qualified</p>}
            {client.qualified === undefined && <p className="text-xl font-bold text-gray-300">N/A</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Upsell Status</p>
            {client.upsold ? (
              <>
                <p className="text-xl font-bold text-green-600">Upsold ✓</p>
                {client.upsellDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(client.upsellDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xl font-bold text-gray-400">Not yet</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Upsell MRR</p>
            {client.upsold && client.upsellMrr ? (
              <>
                <p className="text-xl font-bold text-green-700">{formatCurrency(client.upsellMrr)}</p>
                <p className="text-xs text-gray-400 mt-0.5">per month</p>
              </>
            ) : (
              <p className="text-xl font-bold text-gray-300">—</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Setup Date</p>
            <p className="text-base font-bold text-gray-900">
              {new Date(client.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      ) : (
        // Recurring client metrics
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Monthly Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(client.monthlySpend)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">LTV</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(ltv)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Across all MRR periods</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Start Date</p>
            <p className="text-base font-bold text-gray-900">
              {new Date(client.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Churn Date</p>
            {client.endDate ? (
              <p className="text-base font-bold text-gray-900">
                {new Date(client.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            ) : (
              <p className="text-base font-bold text-gray-300">—</p>
            )}
          </div>
        </div>
      )}

      {/* MRR History — recurring clients only */}
      {client.clientType !== 'flow_setup' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">MRR History</h2>
            {client.status === 'active' && !showMrrForm && (
              <button
                onClick={() => { setNewMrr(String(client.monthlySpend)); setShowMrrForm(true); }}
                className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Update MRR
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">
                {new Date(client.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                <span className="ml-2 text-xs text-gray-400">Start</span>
              </span>
              <span className="font-medium text-gray-700">
                {formatCurrency((client.mrrChanges ?? []).length > 0 ? client.mrrChanges![0].oldMrr : client.monthlySpend)}
              </span>
            </div>
            {(client.mrrChanges ?? []).map((ch) => (
              <div key={ch.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">
                  {new Date(ch.effectiveDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span className={`ml-2 text-xs font-medium ${ch.newMrr > ch.oldMrr ? 'text-green-600' : 'text-red-500'}`}>
                    {ch.newMrr > ch.oldMrr ? '▲ Upgrade' : '▼ Downgrade'}
                  </span>
                </span>
                <span className="font-medium text-gray-700">
                  {formatCurrency(ch.oldMrr)} → {formatCurrency(ch.newMrr)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">
                Current
              </span>
              <span className="font-semibold text-gray-900">{formatCurrency(client.monthlySpend)}</span>
            </div>
          </div>

          {/* Update MRR form */}
          {showMrrForm && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Update MRR</p>
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New MRR</label>
                  <input
                    type="number"
                    value={newMrr}
                    onChange={(e) => setNewMrr(e.target.value)}
                    placeholder="e.g. 2500"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={mrrDate}
                    onChange={(e) => setMrrDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMrrSave}
                  disabled={savingMrr}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {savingMrr ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowMrrForm(false)}
                  className="px-4 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
