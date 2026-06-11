import { api } from './client';
import type { CareEntry, CareEntryResponse, CareLogResponse, CreateCareEntryRequest } from '../types';

export async function logCare(
  gardenId: string,
  plantId: string,
  body: CreateCareEntryRequest,
): Promise<CareEntry> {
  const res = await api.post<CareEntryResponse>(
    `/gardens/${gardenId}/plants/${plantId}/care`,
    body,
  );
  return res.data.entry;
}

export async function getCareLog(
  gardenId: string,
  plantId: string,
  page = 1,
  pageSize = 20,
): Promise<CareLogResponse> {
  const res = await api.get<CareLogResponse>(`/gardens/${gardenId}/plants/${plantId}/care`, {
    params: { page, page_size: pageSize },
  });
  return res.data;
}
