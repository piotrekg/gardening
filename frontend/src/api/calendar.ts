import { api } from './client';
import type { CalendarResponse } from '../types';

export async function getCalendar(month: number, year: number): Promise<CalendarResponse> {
  const res = await api.get<CalendarResponse>('/calendar', { params: { month, year } });
  return res.data;
}
