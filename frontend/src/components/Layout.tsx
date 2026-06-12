import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, Home, Settings, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logout as apiLogout } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';

const NAV_ITEMS: { to: string; labelKey: string; icon: LucideIcon }[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
  { to: '/gardens', labelKey: 'nav.gardens', icon: Sprout },
  { to: '/library', labelKey: 'nav.library', icon: BookOpen },
  { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function navClasses(isActive: boolean): string {
  return [
    'flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-sm font-medium transition-colors duration-200',
    isActive
      ? 'bg-forest-pale text-forest'
      : 'text-ink-soft hover:bg-surface-2 hover:text-copper',
  ].join(' ');
}

/** Playfair wordmark + copper dot — the botanical-atlas logo. */
function Wordmark({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper" aria-hidden="true" />
      <span
        className={`font-display font-bold tracking-tight text-forest ${
          size === 'lg' ? 'text-lg' : 'text-base'
        }`}
      >
        PlantDiary
      </span>
    </span>
  );
}

export function Layout() {
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <Link to="/dashboard" className="px-5 py-5">
          <Wordmark size="lg" />
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => navClasses(isActive)}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-4 text-xs text-ink-faint">
          {t('layout.tagline')}
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur md:ml-60 md:px-6">
        <Link to="/dashboard" className="md:hidden">
          <Wordmark size="sm" />
        </Link>
        <div className="hidden md:block" />
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher className="mr-1" />
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-primary-dark transition hover:ring-2 hover:ring-accent"
              aria-label={t('layout.userMenu')}
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="reveal absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-ink-faint">{user?.email}</p>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-ink-soft transition hover:bg-surface-2"
                >
                  {t('nav.settings')}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="block w-full px-4 py-2.5 text-left text-sm text-danger transition hover:bg-danger-bg"
                >
                  {t('layout.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pb-24 pt-6 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-paper/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-copper' : 'text-ink-faint',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
