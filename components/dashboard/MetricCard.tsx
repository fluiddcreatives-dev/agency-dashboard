interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'indigo' | 'yellow' | 'red' | 'gray';
}

const accentStyles: Record<NonNullable<Props['accent']>, string> = {
  green: 'bg-emerald-50 border-emerald-100',
  indigo: 'bg-indigo-50 border-indigo-100',
  yellow: 'bg-yellow-50 border-yellow-100',
  red: 'bg-red-50 border-red-100',
  gray: 'bg-gray-50 border-gray-100',
};

const dotStyles: Record<NonNullable<Props['accent']>, string> = {
  green: 'bg-emerald-500',
  indigo: 'bg-indigo-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
};

export default function MetricCard({ label, value, sub, accent = 'gray' }: Props) {
  return (
    <div className={`rounded-xl border p-5 ${accentStyles[accent]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotStyles[accent]}`} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
