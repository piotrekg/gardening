import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getMe, logout as apiLogout } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { Skeleton } from '../components/Skeleton';
import { useAuthStore } from '../store/auth';
import type { User } from '../types';

export function SettingsPage() {
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
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load your profile.'));
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

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
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Your PlantDiary account.</p>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Profile</h2>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !profile ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-400">Name</dt>
              <dd className="font-medium text-gray-800">{profile.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-400">Email</dt>
              <dd className="font-medium text-gray-800">{profile.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-400">Member since</dt>
              <dd className="font-medium text-gray-800">
                {format(new Date(profile.created_at), 'd MMMM yyyy')}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
          Profile details are read-only for now — editing your name or email isn't supported yet.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Session</h2>
        <p className="mb-4 text-sm text-gray-500">
          Signing out revokes this device's refresh token.
        </p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {loggingOut ? 'Signing out…' : 'Log out'}
        </button>
      </section>
    </div>
  );
}
