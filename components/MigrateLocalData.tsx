'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/lib/types';
import { addClient } from '@/lib/storage';

const STORAGE_KEY = 'agency_tracker_clients';

export default function MigrateLocalData() {
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Client[];
        if (parsed.length > 0) setLocalClients(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  if (done || localClients.length === 0) return null;

  async function handleMigrate() {
    setMigrating(true);
    try {
      for (const client of localClients) {
        // Replace old non-UUID ids with valid UUIDs that Postgres accepts
        await addClient({ ...client, id: crypto.randomUUID() });
      }
      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
      window.location.reload();
    } catch (err) {
      console.error('Migration failed:', err);
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setMigrating(false);
    }
  }

  function handleDismiss() {
    localStorage.removeItem(STORAGE_KEY);
    setLocalClients([]);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-amber-800">
          Found {localClients.length} client{localClients.length !== 1 ? 's' : ''} from your previous local session
        </p>
        <p className="text-xs text-amber-600 mt-0.5">Import them into the shared database so your team can see them.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDismiss}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
        >
          Discard
        </button>
        <button
          onClick={handleMigrate}
          disabled={migrating}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {migrating ? 'Importing…' : `Import ${localClients.length} clients`}
        </button>
      </div>
    </div>
  );
}
