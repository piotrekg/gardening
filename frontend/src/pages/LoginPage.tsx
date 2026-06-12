import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = t('auth.login.emailRequired');
    if (!password) errors.password = t('auth.login.passwordRequired');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const auth = await login({ email: email.trim(), password });
      setAuth(auth);
      const state = location.state as { from?: string } | null;
      navigate(state?.from ?? '/dashboard', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, t('auth.login.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="reveal w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 block h-2 w-2 rounded-full bg-copper" aria-hidden="true" />
          <h1 className="font-display text-h1 font-bold tracking-tight text-forest">PlantDiary</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{t('auth.login.subtitle')}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="card space-y-4 p-6" noValidate>
          {apiError && (
            <div className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
              {apiError}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-soft">
              {t('auth.login.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder={t('auth.login.emailPlaceholder')}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-soft">
              {t('auth.login.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
            )}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-soft">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            {t('auth.login.createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
}
