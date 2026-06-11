import type { CareStatusValue } from '../types';

const STYLES: Record<CareStatusValue, string> = {
  overdue: 'bg-red-100 text-red-700 ring-red-200',
  due_today: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  ok: 'bg-green-100 text-green-700 ring-green-200',
  unknown: 'bg-gray-100 text-gray-500 ring-gray-200',
};

const LABELS: Record<CareStatusValue, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  ok: 'OK',
  unknown: 'Unknown',
};

interface StatusBadgeProps {
  status: CareStatusValue;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {label ? `${label}: ` : ''}
      {LABELS[status]}
    </span>
  );
}
