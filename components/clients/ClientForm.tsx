'use client';

import { useState } from 'react';
import { Client, ClientStatus, ClientType } from '@/lib/types';

type FormData = {
  name: string;
  clientType: ClientType;
  status: ClientStatus;
  startDate: string;
  endDate: string;
  monthlySpend: string;
  notes: string;
  qualified: boolean | null; // null = not yet assessed
  upsold: boolean;
  upsellMrr: string;
  upsellDate: string;
  onboardingDate: string;
  flowsLiveDate: string;
};

const defaultForm: FormData = {
  name: '',
  clientType: 'recurring',
  status: 'active',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  monthlySpend: '',
  notes: '',
  qualified: null,
  upsold: false,
  upsellMrr: '',
  upsellDate: '',
  onboardingDate: '',
  flowsLiveDate: '',
};

function clientToForm(client: Client): FormData {
  return {
    name: client.name,
    clientType: client.clientType ?? 'recurring',
    status: client.status,
    startDate: client.startDate,
    endDate: client.endDate ?? '',
    monthlySpend: client.monthlySpend.toString(),
    notes: client.notes,
    qualified: client.qualified ?? null,
    upsold: client.upsold ?? false,
    upsellMrr: client.upsellMrr?.toString() ?? '',
    upsellDate: client.upsellDate ?? '',
    onboardingDate: client.onboardingDate ?? '',
    flowsLiveDate: client.flowsLiveDate ?? '',
  };
}

interface Props {
  client?: Client;
  initialClientType?: ClientType;
  onSave: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export default function ClientForm({ client, initialClientType, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>(() => {
    const base = client ? clientToForm(client) : defaultForm;
    if (!client && initialClientType) return { ...base, clientType: initialClientType };
    return base;
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      clientType: form.clientType,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      monthlySpend: parseFloat(form.monthlySpend) || 0,
      notes: form.notes,
      qualified:
        form.clientType === 'flow_setup' && form.qualified !== null
          ? form.qualified
          : undefined,
      upsold: form.clientType === 'flow_setup' ? form.upsold : undefined,
      upsellMrr:
        form.clientType === 'flow_setup' && form.upsold
          ? parseFloat(form.upsellMrr) || 0
          : undefined,
      upsellDate:
        form.clientType === 'flow_setup' && form.upsold && form.upsellDate
          ? form.upsellDate
          : undefined,
      onboardingDate: form.clientType === 'flow_setup' && form.onboardingDate ? form.onboardingDate : undefined,
      flowsLiveDate: form.clientType === 'flow_setup' && form.flowsLiveDate ? form.flowsLiveDate : undefined,
    });
  }

  const isFlowSetup = form.clientType === 'flow_setup';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Client Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client Type</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => set('clientType', 'recurring')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  !isFlowSetup
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Recurring Client
              </button>
              <button
                type="button"
                onClick={() => set('clientType', 'flow_setup')}
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                  isFlowSetup
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Flow Setup
              </button>
            </div>
            {isFlowSetup && (
              <p className="text-xs text-gray-400 mt-1">
                One-time brand setup — tracked separately from recurring MRR
              </p>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isFlowSetup ? 'Setup Fee (USD)' : 'Monthly Revenue (USD)'} *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.monthlySpend}
                onChange={(e) => set('monthlySpend', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isFlowSetup ? 'Setup Date *' : 'Start Date *'}
              </label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className={`grid gap-4 ${form.status !== 'active' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as ClientStatus)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            {form.status !== 'active' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.status === 'churned' ? 'Churned Date' : 'Paused Date'}
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Flow Setup: Onboarding → Live dates */}
          {isFlowSetup && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onboarding Date</label>
                <input
                  type="date"
                  value={form.onboardingDate}
                  onChange={(e) => set('onboardingDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flows Live Date</label>
                <input
                  type="date"
                  value={form.flowsLiveDate}
                  onChange={(e) => set('flowsLiveDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Flow Setup: Qualification + Upsell tracking */}
          {isFlowSetup && (
            <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 space-y-3">
              {/* Qualified toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead Qualification</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
                  <button
                    type="button"
                    onClick={() => set('qualified', null)}
                    className={`flex-1 py-1.5 font-medium transition-colors ${
                      form.qualified === null
                        ? 'bg-gray-200 text-gray-700'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    N/A
                  </button>
                  <button
                    type="button"
                    onClick={() => set('qualified', true)}
                    className={`flex-1 py-1.5 font-medium border-l border-gray-200 transition-colors ${
                      form.qualified === true
                        ? 'bg-green-500 text-white'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    Qualified
                  </button>
                  <button
                    type="button"
                    onClick={() => set('qualified', false)}
                    className={`flex-1 py-1.5 font-medium border-l border-gray-200 transition-colors ${
                      form.qualified === false
                        ? 'bg-red-500 text-white'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    Not Qualified
                  </button>
                </div>
              </div>

              <div className="border-t border-orange-200 pt-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Upsold to recurring?</label>
                <button
                  type="button"
                  onClick={() => set('upsold', !form.upsold)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.upsold ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.upsold ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {form.upsold && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Upsell MRR (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.upsellMrr}
                      onChange={(e) => set('upsellMrr', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="2500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Upsell Date</label>
                    <input
                      type="date"
                      value={form.upsellDate}
                      onChange={(e) => set('upsellDate', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Any notes about this client..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {client ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
