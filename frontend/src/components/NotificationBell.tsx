import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDateFnsLocale } from '../i18n/dateLocale';
import { useNotificationStore } from '../store/notifications';

export function NotificationBell() {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();
  const { notifications, unreadCount, loading, fetch, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void fetch();
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-[3px] border border-parchment-dark text-ink-muted transition-colors hover:border-copper hover:text-copper"
        aria-label={
          unreadCount > 0
            ? t('notifications.ariaUnread', { count: unreadCount })
            : t('notifications.aria')
        }
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-paper">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="reveal absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-sm font-semibold text-ink">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-faint">{t('common.loading')}</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-faint">
                {t('notifications.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm text-ink">{n.message}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {t(`notifications.types.${n.type}`, {
                        defaultValue: n.type.replace(/_/g, ' '),
                      })}{' '}
                      ·{' '}
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line px-4 py-2 text-center">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('notifications.goToDashboard')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
