import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { NotificationBell } from './NotificationBell';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏡' },
  { to: '/gardens', label: 'Gardens', icon: '🌻' },
  { to: '/library', label: 'Library', icon: '📚' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function navClasses(isActive: boolean): string {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-primary-light/70 text-primary-dark'
      : 'text-gray-600 hover:bg-primary-light/40 hover:text-primary-dark',
  ].join(' ');
}

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      if (refreshToken) await apiLogout({ refresh_token: refreshToken });
    } catch {
      // Best-effort server-side revocation; always clear locally.
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-100 bg-white md:flex">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-white">
            🌿
          </span>
          <span className="text-lg font-bold tracking-tight text-primary-dark">PlantDiary</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navClasses(isActive)}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-400">
          PlantDiary · grow happy 🌱
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-100 bg-white/90 px-4 backdrop-blur md:ml-60 md:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-base text-white">
            🌿
          </span>
          <span className="text-base font-bold text-primary-dark">PlantDiary</span>
        </Link>
        <div className="hidden md:block" />
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-primary-dark transition hover:ring-2 hover:ring-accent"
              aria-label="User menu"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl bg-white shadow-card-hover ring-1 ring-gray-100">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{user?.name}</p>
                  <p className="truncate text-xs text-gray-400">{user?.email}</p>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="block w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pb-24 pt-6 md:ml-60 md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
                isActive ? 'text-primary' : 'text-gray-400',
              ].join(' ')
            }
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
