'use client';

import { useEffect, useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Client } from '@/lib/types';
import ClientTable from '@/components/clients/ClientTable';
import ClientForm from '@/components/clients/ClientForm';
import { createBrowserClient } from '@/lib/supabase';

export default function ClientsPage() {
  const { clients, loaded, addClient } = useClients();
  const [showForm, setShowForm] = useState(false);
  const [isPM, setIsPM] = useState(false);

  useEffect(() => {
    createBrowserClient().auth.getUser().then(({ data }) => {
      setIsPM(data.user?.user_metadata?.role === 'pm');
    });
  }, []);

  const visibleClients = isPM ? clients.filter((c) => c.clientType === 'flow_setup') : clients;

  function handleSave(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    addClient(data);
    setShowForm(false);
  }

  if (!loaded) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">{visibleClients.length} client{visibleClients.length !== 1 ? 's' : ''} total</p>
      </div>

      <ClientTable clients={visibleClients} onAdd={() => setShowForm(true)} />

      {showForm && (
        <ClientForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
