import { api } from './client';
import type {
  CompatibilityResponse,
  CreateGardenRequest,
  Garden,
  GardenDetailResponse,
  GardenResponse,
  GardensListResponse,
  UpdateGardenRequest,
} from '../types';

export async function listGardens(): Promise<Garden[]> {
  const res = await api.get<GardensListResponse>('/gardens');
  return res.data.gardens;
}

export async function createGarden(body: CreateGardenRequest): Promise<Garden> {
  const res = await api.post<GardenResponse>('/gardens', body);
  return res.data.garden;
}

export async function getGarden(id: string): Promise<GardenDetailResponse> {
  const res = await api.get<GardenDetailResponse>(`/gardens/${id}`);
  return res.data;
}

export async function updateGarden(id: string, body: UpdateGardenRequest): Promise<Garden> {
  const res = await api.put<GardenResponse>(`/gardens/${id}`, body);
  return res.data.garden;
}

export async function deleteGarden(id: string): Promise<void> {
  await api.delete(`/gardens/${id}`);
}

export async function getGardenCompatibility(gardenId: string): Promise<CompatibilityResponse> {
  const res = await api.get<CompatibilityResponse>(`/gardens/${gardenId}/compatibility`);
  return res.data;
}
