import { api } from './client';
import type {
  CreatePlantInstanceRequest,
  PlantInstance,
  PlantInstanceDetailResponse,
  PlantInstanceResponse,
  PlantInstancesListResponse,
  UpdatePlantInstanceRequest,
} from '../types';

export async function addPlantToGarden(
  gardenId: string,
  body: CreatePlantInstanceRequest,
): Promise<PlantInstance> {
  const res = await api.post<PlantInstanceResponse>(`/gardens/${gardenId}/plants`, body);
  return res.data.plant;
}

export async function listGardenPlants(gardenId: string): Promise<PlantInstance[]> {
  const res = await api.get<PlantInstancesListResponse>(`/gardens/${gardenId}/plants`);
  return res.data.plants;
}

export async function getGardenPlant(
  gardenId: string,
  plantId: string,
): Promise<PlantInstanceDetailResponse> {
  const res = await api.get<PlantInstanceDetailResponse>(
    `/gardens/${gardenId}/plants/${plantId}`,
  );
  return res.data;
}

export async function updateGardenPlant(
  gardenId: string,
  plantId: string,
  body: UpdatePlantInstanceRequest,
): Promise<PlantInstance> {
  const res = await api.put<PlantInstanceResponse>(
    `/gardens/${gardenId}/plants/${plantId}`,
    body,
  );
  return res.data.plant;
}

export async function deleteGardenPlant(gardenId: string, plantId: string): Promise<void> {
  await api.delete(`/gardens/${gardenId}/plants/${plantId}`);
}
