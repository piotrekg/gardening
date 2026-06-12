import { api } from './client';
import type {
  CompanionsResponse,
  LibraryCategoriesResponse,
  LibraryListResponse,
  LibraryPlantDetail,
  LibraryPlantResponse,
  LibrarySearchParams,
} from '../types';

export async function searchLibrary(params: LibrarySearchParams): Promise<LibraryListResponse> {
  // Serialize explicitly so empty/false values are omitted and `enriched`
  // is sent as the literal `true` the backend expects.
  const query: Record<string, string | number> = {};
  if (params.search) query.search = params.search;
  if (params.category) query.category = params.category;
  if (params.lifecycle) query.lifecycle = params.lifecycle;
  if (params.difficulty) query.difficulty = params.difficulty;
  if (params.sun) query.sun = params.sun;
  if (params.tag) query.tag = params.tag;
  if (params.enriched) query.enriched = 'true';
  if (params.page) query.page = params.page;
  if (params.page_size) query.page_size = params.page_size;
  const res = await api.get<LibraryListResponse>('/plants/library', { params: query });
  return res.data;
}

export async function getLibraryCategories(): Promise<string[]> {
  const res = await api.get<LibraryCategoriesResponse>('/plants/library/categories');
  return res.data.categories;
}

export async function getLibraryPlant(id: string): Promise<LibraryPlantDetail> {
  const res = await api.get<LibraryPlantResponse>(`/plants/library/${id}`);
  return res.data.plant;
}

export async function getLibraryPlantCompanions(id: string): Promise<CompanionsResponse> {
  const res = await api.get<CompanionsResponse>(`/plants/library/${id}/companions`);
  return res.data;
}
