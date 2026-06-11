import { api } from './client';
import type { NotificationsResponse } from '../types';

export async function getNotifications(): Promise<NotificationsResponse> {
  const res = await api.get<NotificationsResponse>('/notifications');
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read');
}
