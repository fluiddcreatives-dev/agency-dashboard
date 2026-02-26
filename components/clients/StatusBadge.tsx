import { ClientStatus } from '@/lib/types';

const styles: Record<ClientStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-yellow-100 text-yellow-700',
  churned: 'bg-red-100 text-red-600',
};

const labels: Record<ClientStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  churned: 'Churned',
};

export default function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
