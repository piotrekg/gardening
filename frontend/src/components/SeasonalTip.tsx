import { useTranslation } from 'react-i18next';
import { Sun } from 'lucide-react';

export function SeasonalTip({ month }: { month: number }) {
  const { t } = useTranslation();
  if (month < 1 || month > 12) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-clay-light bg-clay-light/40 p-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-light text-clay-dark">
        <Sun className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-clay-dark">
          {t('seasonalTip.title')}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{t(`seasonalTip.m${month}`)}</p>
      </div>
    </div>
  );
}
