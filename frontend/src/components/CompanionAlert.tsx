import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import type { CompatibilityConflict } from '../types';

export function CompanionAlert({ conflicts }: { conflicts: CompatibilityConflict[] }) {
  const { t } = useTranslation();
  if (conflicts.length === 0) return null;

  const hasHard = conflicts.some((c) => c.severity === 'conflict');

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasHard ? 'border-danger-line bg-danger-bg' : 'border-warn-line bg-warn-bg'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={`h-4 w-4 ${hasHard ? 'text-danger' : 'text-clay-dark'}`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <h3 className={`text-sm font-semibold ${hasHard ? 'text-danger' : 'text-clay-dark'}`}>
          {hasHard ? t('companion.titleConflicts') : t('companion.titleWarnings')}
        </h3>
      </div>
      <ul className="mt-2 space-y-1.5">
        {conflicts.map((c, i) => (
          <li
            key={`${c.plant_a.id}-${c.plant_b.id}-${i}`}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
          >
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                c.severity === 'conflict'
                  ? 'bg-danger-line text-danger'
                  : 'bg-warn-line text-clay-dark'
              }`}
            >
              {t(`companion.severity.${c.severity}`)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              {c.plant_a.display_name}
              <ArrowLeftRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
              {c.plant_b.display_name}
            </span>
            <span className="text-ink-soft">— {c.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
