import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-5xl" aria-hidden="true">
        🥀
      </p>
      <h1 className="mt-4 text-xl font-bold text-gray-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('notFound.message')}</p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
