import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary-dark">
        <Sprout className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-h1 font-semibold text-ink">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t('notFound.message')}</p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
