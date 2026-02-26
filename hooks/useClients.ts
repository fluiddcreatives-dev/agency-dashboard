'use client';

import { useState, useEffect, useCallback } from 'react';
import { Client } from '@/lib/types';
import { createBrowserClient } from '@/lib/supabase';
import {
  getClients,
  addClient as storageAdd,
  updateClient as storageUpdate,
  deleteClient as storageDelete,
} from '@/lib/storage';

function generateId(): string {
  return crypto.randomUUID();
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    getClients()
      .then((data) => {
        setClients(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Real-time subscription — all team members see live updates
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        getClients().then(setClients).catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addClient = useCallback(
    async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const client: Client = { ...data, id: generateId(), createdAt: now, updatedAt: now };
      setClients((prev) => [client, ...prev]);
      await storageAdd(client);
    },
    []
  );

  const updateClient = useCallback(async (updated: Client) => {
    const client: Client = { ...updated, updatedAt: new Date().toISOString() };
    setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    await storageUpdate(client);
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    await storageDelete(id);
  }, []);

  const markChurned = useCallback(
    async (id: string) => {
      const client = clients.find((c) => c.id === id);
      if (!client) return;
      await updateClient({
        ...client,
        status: 'churned',
        endDate: new Date().toISOString().split('T')[0],
      });
    },
    [clients, updateClient]
  );

  return { clients, loaded, addClient, updateClient, deleteClient, markChurned };
}
