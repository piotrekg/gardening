import { api } from './client';
import type { DashboardResponse } from '../types';

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await api.get<DashboardResponse>('/dashboard');
  return res.data;
}
