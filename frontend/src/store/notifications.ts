import { create } from 'zustand';
import { getNotifications, markAllNotificationsRead } from '../api/notifications';
import type { AppNotification } from '../types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetch: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const data = await getNotifications();
      set({ notifications: data.notifications, unreadCount: data.unread_count });
    } finally {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    await markAllNotificationsRead();
    set({ unreadCount: 0 });
  },
}));
