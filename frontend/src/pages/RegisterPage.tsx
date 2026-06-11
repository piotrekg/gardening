import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

/** Client-side mirror of API password rules: min 8 chars, ≥1 uppercase, ≥1 digit. */
function validatePassword(password: string, t: TFunction): string | undefined {
  if (password.length < 8) return t('auth.register.passwordMinLength');
  if (!/[A-Z]/.test(password)) return t('auth.register.passwordUppercase');
  if (!/[0-9]/.test(password)) return t('auth.register.passwordNumber');
  return undefined;
}

export function RegisterPage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = t('auth.register.nameRequired');
    if (!email.trim()) {
      errors.email = t('auth.register.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t('auth.register.emailInvalid');
    }
    const pwError = validatePassword(password, t);
    if (pwError) errors.password = pwError;
    if (confirm !== password) errors.confirm = t('auth.register.confirmMismatch');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const auth = await register({ name: name.trim(), email: email.trim(), password });
      setAuth(auth);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, t('auth.register.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-white">
            🌿
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-primary-dark">
            {t('auth.register.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('auth.register.subtitle')}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="card space-y-4 p-6" noValidate>
          {apiError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {apiError}
            </div>
          )}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              {t('auth.register.name')}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder={t('auth.register.namePlaceholder')}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
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
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              {t('auth.login.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder={t('auth.register.passwordPlaceholder')}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">{t('auth.register.passwordHint')}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
              {t('auth.register.confirm')}
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
              placeholder={t('auth.register.confirmPlaceholder')}
            />
            {fieldErrors.confirm && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirm}</p>
            )}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t('auth.register.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
