import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '🌱', title, message, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <p className="max-w-sm text-sm text-gray-500">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
