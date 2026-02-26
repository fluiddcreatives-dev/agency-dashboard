'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import { Client } from '@/lib/types';
import { formatCurrency } from '@/lib/metrics';
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
  const { clients, loaded, updateClient, deleteClient, markChurned } = useClients();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const today = new Date().toISOString();
  const end = client.endDate ?? today;
  const months = Math.max(1, monthsBetween(client.startDate, end));
  const ltv = client.monthlySpend * months;

  function handleSave(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    updateClient({
      ...data,
      id: client!.id,
      createdAt: client!.createdAt,
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
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
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Edit
          </button>
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
            <p className="text-xs text-gray-400 mt-0.5">
              {formatCurrency(client.monthlySpend)} × {months} mo
            </p>
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

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Notes</h2>
        {client.notes ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No notes yet. Click Edit to add some.</p>
        )}
      </div>

      {editing && (
        <ClientForm client={client} onSave={handleSave} onCancel={() => setEditing(false)} />
      )}
    </div>
  );
}
