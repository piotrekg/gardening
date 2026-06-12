import { useTranslation } from 'react-i18next';

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-light border-t-primary" />
      <span className="text-sm text-ink-soft">{label ?? t('common.loading')}</span>
    </div>
  );
}
