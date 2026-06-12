import type { ReactNode } from 'react';
import { Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Sprout, title, message, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
