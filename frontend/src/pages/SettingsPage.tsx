import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getMe, logout as apiLogout } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Skeleton } from '../components/Skeleton';
import { useDateFnsLocale } from '../i18n/dateLocale';
import { useAuthStore } from '../store/auth';
import type { User } from '../types';

export function SettingsPage() {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();
  const storedUser = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(storedUser);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => {
        if (!cancelled) {
          setProfile(u);
          setUser(u);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('settings.profileError')));
      });
    return () => {
      cancelled = true;
    };
  }, [setUser, t]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (refreshToken) await apiLogout({ refresh_token: refreshToken });
    } catch {
      // Best-effort revocation; always clear local state.
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="eyebrow mb-2">{t('pageEyebrow.settings')}</p>
        <h1 className="text-h1 font-semibold tracking-tight text-ink">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('settings.subtitle')}</p>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-h2 font-semibold text-ink">{t('settings.profile')}</h2>
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !profile ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-faint">{t('settings.name')}</dt>
              <dd className="font-medium text-ink">{profile.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-faint">{t('settings.email')}</dt>
              <dd className="font-medium text-ink">{profile.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-faint">{t('settings.memberSince')}</dt>
              <dd className="font-medium text-ink">
                {format(new Date(profile.created_at), 'd MMMM yyyy', { locale: dateLocale })}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-faint">
          {t('settings.profileReadOnly')}
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-h2 font-semibold text-ink">{t('language.label')}</h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-soft">{t('language.description')}</p>
          <LanguageSwitcher />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-h2 font-semibold text-ink">{t('settings.session')}</h2>
        <p className="mb-4 text-sm text-ink-soft">{t('settings.sessionInfo')}</p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="rounded-lg border border-danger-line bg-paper px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-bg disabled:opacity-60"
        >
          {loggingOut ? t('settings.loggingOut') : t('settings.logout')}
        </button>
      </section>
    </div>
  );
}
