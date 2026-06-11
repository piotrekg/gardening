import { useTranslation } from 'react-i18next';

export function SeasonalTip({ month }: { month: number }) {
  const { t } = useTranslation();
  if (month < 1 || month > 12) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl bg-primary-light/50 p-4">
      <span className="text-xl" aria-hidden="true">
        🌤️
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark/70">
          {t('seasonalTip.title')}
        </p>
        <p className="mt-0.5 text-sm text-primary-dark">{t(`seasonalTip.m${month}`)}</p>
      </div>
    </div>
  );
}
