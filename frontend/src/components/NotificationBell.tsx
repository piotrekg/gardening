import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationStore } from '../store/notifications';

export function NotificationBell() {
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
        className="relative rounded-full p-2 text-gray-500 transition hover:bg-primary-light/60 hover:text-primary"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white shadow-card-hover ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                You're all caught up. 🌿
              </p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm text-gray-700">{n.message}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {n.type.replace(/_/g, ' ')} ·{' '}
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
