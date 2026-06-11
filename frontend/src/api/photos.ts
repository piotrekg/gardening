import { api } from './client';
import type { Photo, PhotoResponse, PhotosListResponse } from '../types';

export async function uploadPhoto(
  gardenId: string,
  plantId: string,
  file: File,
): Promise<Photo> {
  const form = new FormData();
  form.append('photo', file);
  const res = await api.post<PhotoResponse>(
    `/gardens/${gardenId}/plants/${plantId}/photos`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.photo;
}

export async function listPhotos(gardenId: string, plantId: string): Promise<Photo[]> {
  const res = await api.get<PhotosListResponse>(
    `/gardens/${gardenId}/plants/${plantId}/photos`,
  );
  return res.data.photos;
}

export async function deletePhoto(
  gardenId: string,
  plantId: string,
  photoId: string,
): Promise<void> {
  await api.delete(`/gardens/${gardenId}/plants/${plantId}/photos/${photoId}`);
}
