import { api } from './client';
import type {
  CompanionsResponse,
  LibraryCategoriesResponse,
  LibraryListResponse,
  LibraryPlant,
  LibraryPlantResponse,
  LibrarySearchParams,
} from '../types';

export async function searchLibrary(params: LibrarySearchParams): Promise<LibraryListResponse> {
  const res = await api.get<LibraryListResponse>('/plants/library', { params });
  return res.data;
}

export async function getLibraryCategories(): Promise<string[]> {
  const res = await api.get<LibraryCategoriesResponse>('/plants/library/categories');
  return res.data.categories;
}

export async function getLibraryPlant(id: string): Promise<LibraryPlant> {
  const res = await api.get<LibraryPlantResponse>(`/plants/library/${id}`);
  return res.data.plant;
}

export async function getLibraryPlantCompanions(id: string): Promise<CompanionsResponse> {
  const res = await api.get<CompanionsResponse>(`/plants/library/${id}/companions`);
  return res.data;
}
