import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CareStatusValue } from '../types';

const STYLES: Record<CareStatusValue, string> = {
  overdue: 'bg-danger-bg text-danger border-danger-line',
  due_today: 'bg-warn-bg text-clay-dark border-warn-line',
  ok: 'bg-primary-light text-primary-dark border-accent-light',
  unknown: 'bg-surface-2 text-ink-faint border-line',
};

const ICONS: Record<CareStatusValue, LucideIcon> = {
  overdue: AlertCircle,
  due_today: Clock,
  ok: CheckCircle2,
  unknown: Circle,
};

const LABEL_KEYS: Record<CareStatusValue, string> = {
  overdue: 'status.overdue',
  due_today: 'status.dueToday',
  ok: 'status.ok',
  unknown: 'status.unknown',
};

interface StatusBadgeProps {
  status: CareStatusValue;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { t } = useTranslation();
  const Icon = ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      {label ? `${label}: ` : ''}
      {t(LABEL_KEYS[status])}
    </span>
  );
}
