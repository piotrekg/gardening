import { useTranslation } from 'react-i18next';
import type { CompatibilityConflict } from '../types';

export function CompanionAlert({ conflicts }: { conflicts: CompatibilityConflict[] }) {
  const { t } = useTranslation();
  if (conflicts.length === 0) return null;

  const hasHard = conflicts.some((c) => c.severity === 'conflict');

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasHard ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true">⚠️</span>
        <h3 className={`text-sm font-semibold ${hasHard ? 'text-red-800' : 'text-yellow-800'}`}>
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
                  ? 'bg-red-200 text-red-800'
                  : 'bg-yellow-200 text-yellow-800'
              }`}
            >
              {t(`companion.severity.${c.severity}`)}
            </span>
            <span className="font-medium text-gray-800">
              {c.plant_a.display_name} ↔ {c.plant_b.display_name}
            </span>
            <span className="text-gray-600">— {c.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
