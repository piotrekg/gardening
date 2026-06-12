import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, Home, Menu, Settings, Sprout, X } from 'lucide-react';
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

/** Playfair wordmark + copper dot — the botanical-atlas logo (S3). */
function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper" aria-hidden="true" />
      <span className="font-display text-base font-bold tracking-tight text-forest">
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
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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
      {/* Sidebar (S1-S3, S6): fixed left, 220px; drawer on mobile. */}
      <aside
        className={`fixed inset-y-0 left-0 z-[200] flex w-[220px] flex-col border-r border-parchment-dark bg-white transition-transform duration-200 ease-out max-md:shadow-lift md:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-[220px]'
        }`}
      >
        <Link
          to="/dashboard"
          className="flex items-center justify-between border-b border-parchment-dark px-5 pb-8 pt-5"
        >
          <Wordmark />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-[3px] text-ink-muted transition hover:text-copper md:hidden"
            aria-label={t('layout.closeMenu')}
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </Link>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon strokeWidth={1.5} aria-hidden="true" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-parchment-dark px-5 py-4 text-xs text-ink-faint">
          {t('layout.tagline')}
        </div>
      </aside>

      {/* Scrim behind the mobile drawer. */}
      {drawerOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-[150] bg-forest/30 md:hidden"
        />
      )}

      {/* Topbar (S4, S6): fixed, 52px. */}
      <header className="fixed inset-x-0 top-0 z-[150] flex h-[52px] items-center gap-3 border-b border-parchment-dark bg-paper/95 px-4 backdrop-blur md:left-[220px] md:px-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-parchment-dark text-ink-muted transition hover:border-copper hover:text-copper md:hidden"
          aria-label={t('layout.openMenu')}
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <Link to="/dashboard" className="md:hidden">
          <Wordmark />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-[12px] font-semibold text-parchment transition hover:ring-2 hover:ring-copper"
              aria-label={t('layout.userMenu')}
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="reveal absolute right-0 z-[200] mt-2 w-52 overflow-hidden rounded-[6px] border border-line bg-surface shadow-lift">
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

      {/* Main content (S6): offset by the fixed sidebar + topbar. */}
      <main className="px-4 pb-16 pt-[calc(52px+1.5rem)] md:ml-[220px] md:px-8 md:pb-10 md:pt-[calc(52px+2rem)]">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
