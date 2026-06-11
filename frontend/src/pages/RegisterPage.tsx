import { useState } from 'react';
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
function validatePassword(password: string): string | undefined {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return undefined;
}

export function RegisterPage() {
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
    if (!name.trim()) errors.name = 'Name is required.';
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    const pwError = validatePassword(password);
    if (pwError) errors.password = pwError;
    if (confirm !== password) errors.confirm = 'Passwords do not match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const auth = await register({ name: name.trim(), email: email.trim(), password });
      setAuth(auth);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
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
          <h1 className="text-2xl font-bold tracking-tight text-primary-dark">Join PlantDiary</h1>
          <p className="mt-1 text-sm text-gray-500">Start tracking your garden in minutes.</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="card space-y-4 p-6" noValidate>
          {apiError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {apiError}
            </div>
          )}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Jane Gardener"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                At least 8 characters, one uppercase letter and one number.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
              placeholder="Repeat your password"
            />
            {fieldErrors.confirm && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirm}</p>
            )}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
