import { Client } from './types';
import { createBrowserClient } from './supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    clientType: row.client_type ?? undefined,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    monthlySpend: Number(row.monthly_spend),
    notes: row.notes ?? '',
    qualified: row.qualified ?? undefined,
    upsold: row.upsold ?? undefined,
    upsellMrr: row.upsell_mrr != null ? Number(row.upsell_mrr) : undefined,
    upsellDate: row.upsell_date ?? undefined,
    onboardingDate: row.onboarding_date ?? undefined,
    flowsLiveDate: row.flows_live_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(client: Client) {
  return {
    id: client.id,
    name: client.name,
    client_type: client.clientType ?? null,
    status: client.status,
    start_date: client.startDate,
    end_date: client.endDate ?? null,
    monthly_spend: client.monthlySpend,
    notes: client.notes,
    qualified: client.qualified ?? null,
    upsold: client.upsold ?? null,
    upsell_mrr: client.upsellMrr ?? null,
    upsell_date: client.upsellDate ?? null,
    onboarding_date: client.onboardingDate ?? null,
    flows_live_date: client.flowsLiveDate ?? null,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
}

export async function getClients(): Promise<Client[]> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toClient);
}

export async function addClient(client: Client): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.from('clients').insert(toRow(client));
  if (error) throw error;
}

export async function updateClient(client: Client): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from('clients')
    .update(toRow(client))
    .eq('id', client.id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createBrowserClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
