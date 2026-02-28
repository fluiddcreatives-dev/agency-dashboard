import { Client, ClientType, Metrics } from './types';

function isRecurring(c: Client): boolean {
  return !c.clientType || c.clientType === 'recurring';
}

function toYearMonth(isoDate: string): string {
  return isoDate.slice(0, 7); // "YYYY-MM"
}

function isActiveInMonth(client: Client, month: string): boolean {
  const clientStart = toYearMonth(client.startDate);
  if (clientStart > month) return false;
  if (!client.endDate) return true;
  return toYearMonth(client.endDate) >= month;
}

function advanceMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return next;
}

export interface MonthPoint {
  month: string; // "YYYY-MM"
  label: string; // "Jan '24"
  mrr: number;
}

export interface ChurnPoint {
  month: string;
  label: string;
  churned: number;
  churnRate: number; // %
}

export interface NRRPoint {
  month: string;
  label: string;
  nrr: number;       // % — retained MRR / prior month MRR * 100
  retainedMRR: number;
  previousMRR: number;
}

export function getMRRHistory(clients: Client[]): MonthPoint[] {
  if (clients.length === 0) return [];

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const earliest = clients.map((c) => toYearMonth(c.startDate)).sort()[0];

  const result: MonthPoint[] = [];
  let month = earliest;

  while (month <= currentMonth) {
    const [y, m] = month.split('-').map(Number);
    const mrr = clients
      .filter((c) => isActiveInMonth(c, month))
      .reduce((sum, c) => sum + c.monthlySpend, 0);

    result.push({
      month,
      label: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      mrr,
    });

    month = advanceMonth(month);
  }

  return result;
}

export function getMonthlyChurn(clients: Client[]): ChurnPoint[] {
  const today = new Date();
  const result: ChurnPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const churned = clients.filter(
      (c) => !!c.endDate && toYearMonth(c.endDate) === month
    ).length;

    // Active at start of month = active in this month (includes those who churned during it)
    const activeAtStart = clients.filter((c) => isActiveInMonth(c, month)).length;
    const churnRate = activeAtStart > 0 ? Math.round((churned / activeAtStart) * 1000) / 10 : 0;

    result.push({
      month,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      churned,
      churnRate,
    });
  }

  return result;
}

export function getMonthlyNRR(clients: Client[]): NRRPoint[] {
  const today = new Date();
  const result: NRRPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const prevD = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;

    // Clients who were active last month
    const prevActive = clients.filter((c) => isActiveInMonth(c, prevMonth));
    const previousMRR = prevActive.reduce((sum, c) => sum + c.monthlySpend, 0);

    // Of those, how much MRR carried into this month (i.e. they didn't churn)
    const retainedMRR = prevActive
      .filter((c) => isActiveInMonth(c, month))
      .reduce((sum, c) => sum + c.monthlySpend, 0);

    // If no prior MRR, NRR is null (no data) — we store -1 as sentinel
    const nrr = previousMRR > 0 ? Math.round((retainedMRR / previousMRR) * 1000) / 10 : -1;

    result.push({
      month,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      nrr,
      retainedMRR,
      previousMRR,
    });
  }

  return result;
}

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
  );
}

export function computeMetrics(clients: Client[]): Metrics {
  const today = new Date().toISOString();

  const active = clients.filter((c) => c.status === 'active');
  const paused = clients.filter((c) => c.status === 'paused');
  const churned = clients.filter((c) => c.status === 'churned');

  const mrr = active.reduce((sum, c) => sum + c.monthlySpend, 0);
  const avgMonthlySpend = active.length > 0 ? mrr / active.length : 0;

  // LTV = monthlySpend * months active (for all clients ever)
  const allWithSpend = clients.filter((c) => c.monthlySpend > 0);
  const totalLtv = allWithSpend.reduce((sum, c) => {
    const end = c.endDate ?? today;
    const months = Math.max(1, monthsBetween(c.startDate, end));
    return sum + c.monthlySpend * months;
  }, 0);
  const avgLtv = allWithSpend.length > 0 ? totalLtv / allWithSpend.length : 0;

  // Churn rate = churned / (active + churned)
  const churnBase = active.length + churned.length;
  const churnRate = churnBase > 0 ? (churned.length / churnBase) * 100 : 0;

  // Avg retention in months (all clients)
  const retentionMonths = clients.map((c) => {
    const end = c.endDate ?? today;
    return Math.max(1, monthsBetween(c.startDate, end));
  });
  const avgRetentionMonths =
    retentionMonths.length > 0
      ? retentionMonths.reduce((a, b) => a + b, 0) / retentionMonths.length
      : 0;

  return {
    activeClients: active.length,
    pausedClients: paused.length,
    churnedClients: churned.length,
    mrr,
    avgMonthlySpend,
    avgLtv,
    churnRate,
    avgRetentionMonths,
  };
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMonths(n: number): string {
  if (n < 1) return '< 1 mo';
  return `${Math.round(n)} mo`;
}

// ── Flow Setup Metrics ──────────────────────────────────────────────

export interface FlowSetupMonthPoint {
  month: string;
  label: string;
  setups: number;
  qualified: number;
  unqualified: number;
  upsells: number;
  upsellRate: number; // %
  newMrr: number;
}

export function getFlowSetupMonthlyMetrics(clients: Client[]): FlowSetupMonthPoint[] {
  const flowClients = clients.filter((c) => c.clientType === 'flow_setup');
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Find the earliest month across startDate and upsellDate
  const allDates = flowClients.flatMap((c) =>
    [c.startDate, c.upsellDate].filter(Boolean) as string[]
  );
  const earliest = allDates.length > 0
    ? allDates.map(toYearMonth).sort()[0]
    : currentMonth;

  const result: FlowSetupMonthPoint[] = [];
  let month = earliest;

  while (month <= currentMonth) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1, 1);

    const monthSetups = flowClients.filter((c) => toYearMonth(c.startDate) === month);
    const setups = monthSetups.length;
    const qualified = monthSetups.filter((c) => c.qualified === true).length;
    const unqualified = monthSetups.filter((c) => c.qualified === false).length;
    const upsells = flowClients.filter(
      (c) => c.upsold && c.upsellDate && toYearMonth(c.upsellDate) === month
    ).length;
    const newMrr = flowClients
      .filter((c) => c.upsold && c.upsellDate && toYearMonth(c.upsellDate) === month)
      .reduce((sum, c) => sum + (c.upsellMrr ?? 0), 0);

    result.push({
      month,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      setups,
      qualified,
      unqualified,
      upsells,
      upsellRate: setups > 0 ? Math.round((upsells / setups) * 1000) / 10 : 0,
      newMrr,
    });

    month = advanceMonth(month);
  }

  return result;
}

// ── Month-specific Dashboard Metrics ────────────────────────────────

export interface MonthDashboardMetrics {
  activeCount: number;
  mrr: number;
  churnedCount: number;
  churnRate: number;   // %
  newMrr: number;     // MRR added from new clients this month
  churnedMrr: number; // MRR lost from churned clients this month
  addedMrr: number;   // newMrr - churnedMrr
  avgSpend: number;
  avgRetention: number;
  avgLtv: number;
}

export function getMonthDashboardMetrics(
  clients: Client[],
  month: string
): MonthDashboardMetrics {
  const todayDate = new Date();
  const currentMonth = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`;

  // Active clients: use status for current month (excludes paused), dates for history
  const activeInMonth =
    month === currentMonth
      ? clients.filter((c) => c.status === 'active')
      : clients.filter((c) => isActiveInMonth(c, month) && c.status !== 'paused');
  const activeCount = activeInMonth.length;
  const mrr = activeInMonth.reduce((sum, c) => sum + c.monthlySpend, 0);
  const avgSpend = activeCount > 0 ? mrr / activeCount : 0;

  // Previous month (for churn rate denominator)
  const [y, m] = month.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const activeAtStart = clients.filter((c) => isActiveInMonth(c, prevMonth) && c.status !== 'paused').length;

  // Churned this month — for current month also include paused clients (no endDate)
  // since paused = no longer contributing MRR
  const churnedThisMonth =
    month === currentMonth
      ? clients.filter(
          (c) =>
            (!!c.endDate && toYearMonth(c.endDate) === month) ||
            c.status === 'paused'
        )
      : clients.filter((c) => !!c.endDate && toYearMonth(c.endDate) === month);
  const churnedCount = churnedThisMonth.length;
  const churnedMrr = churnedThisMonth.reduce((sum, c) => sum + c.monthlySpend, 0);
  const churnRate = activeAtStart > 0 ? (churnedCount / activeAtStart) * 100 : 0;

  // New clients started this month
  const newMrr = clients
    .filter((c) => toYearMonth(c.startDate) === month)
    .reduce((sum, c) => sum + c.monthlySpend, 0);
  const addedMrr = newMrr - churnedMrr;

  // Averages based on all clients started on or before this month
  const today = new Date().toISOString();
  const relevant = clients.filter((c) => toYearMonth(c.startDate) <= month);

  const retentionData = relevant.map((c) =>
    Math.max(1, monthsBetween(c.startDate, c.endDate ?? today))
  );
  const avgRetention =
    retentionData.length > 0
      ? retentionData.reduce((a, b) => a + b, 0) / retentionData.length
      : 0;

  const withSpend = relevant.filter((c) => c.monthlySpend > 0);
  const totalLtv = withSpend.reduce((sum, c) => {
    const months = Math.max(1, monthsBetween(c.startDate, c.endDate ?? today));
    return sum + c.monthlySpend * months;
  }, 0);
  const avgLtv = withSpend.length > 0 ? totalLtv / withSpend.length : 0;

  return { activeCount, mrr, churnedCount, churnRate, newMrr, churnedMrr, addedMrr, avgSpend, avgRetention, avgLtv };
}

// Helper used by dashboard — includes upsold flow clients as recurring (using their upsellMrr)
export function recurringOnly(clients: Client[]): Client[] {
  const regular = clients.filter(isRecurring);
  const upsoldAsRecurring = clients
    .filter((c) => c.clientType === 'flow_setup' && c.upsold && (c.upsellMrr ?? 0) > 0)
    .map((c) => ({
      ...c,
      monthlySpend: c.upsellMrr ?? 0,
      startDate: c.upsellDate ?? c.startDate,
      // Only carry endDate if they've actually churned from recurring — flow setup
      // clients often have endDate set for the setup period, not recurring churn
      endDate: c.status === 'active' ? undefined : c.endDate,
    }));
  return [...regular, ...upsoldAsRecurring];
}
