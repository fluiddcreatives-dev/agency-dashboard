export type ClientStatus = 'active' | 'churned' | 'paused';
export type ClientType = 'recurring' | 'flow_setup';

export interface Client {
  id: string;
  name: string;
  clientType?: ClientType; // undefined treated as 'recurring' for backward compat
  status: ClientStatus;
  startDate: string;
  endDate?: string;
  monthlySpend: number;
  notes: string;
  // Flow setup specific
  qualified?: boolean;   // undefined = not yet assessed
  upsold?: boolean;
  upsellMrr?: number;
  upsellDate?: string;
  onboardingDate?: string;  // when onboarding started
  flowsLiveDate?: string;   // when flows went live
  createdAt: string;
  updatedAt: string;
}

export interface Metrics {
  activeClients: number;
  pausedClients: number;
  churnedClients: number;
  mrr: number;
  avgMonthlySpend: number;
  avgLtv: number;
  churnRate: number;
  avgRetentionMonths: number;
}
