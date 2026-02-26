'use client';

import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Client } from '@/lib/types';
import ClientTable from '@/components/clients/ClientTable';
import ClientForm from '@/components/clients/ClientForm';

export default function ClientsPage() {
  const { clients, loaded, addClient } = useClients();
  const [showForm, setShowForm] = useState(false);

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
        <p className="text-sm text-gray-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
      </div>

      <ClientTable clients={clients} onAdd={() => setShowForm(true)} />

      {showForm && (
        <ClientForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
