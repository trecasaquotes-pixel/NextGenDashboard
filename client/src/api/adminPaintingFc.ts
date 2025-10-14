import { apiRequest } from "@/lib/queryClient";
import type { PaintingPackRow, NewPaintingPackRow, FCCatalogRow, NewFCCatalogRow } from "@shared/schema";

// ============================================================
// PAINTING PACKS
// ============================================================

export interface PaintingPacksFilters {
  q?: string;
  active?: string;
  showInQuote?: string;
}

export async function getPaintingPacks(filters?: PaintingPacksFilters): Promise<PaintingPackRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.active && filters.active !== '' && filters.active !== 'all') {
    params.append('active', filters.active);
  }
  if (filters?.showInQuote && filters.showInQuote !== '' && filters.showInQuote !== 'all') {
    params.append('showInQuote', filters.showInQuote);
  }
  
  const queryString = params.toString();
  const url = `/api/admin/painting-packs${queryString ? `?${queryString}` : ''}`;
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch painting packs: ${res.statusText}`);
  return res.json();
}

export async function createPaintingPack(data: Omit<NewPaintingPackRow, 'bulletsJson'> & { bulletsJson: string[] }): Promise<PaintingPackRow> {
  const res = await apiRequest('POST', '/api/admin/painting-packs', data);
  return res.json();
}

export async function updatePaintingPack(id: string, data: Partial<Omit<PaintingPackRow, 'id' | 'createdAt' | 'updatedAt'>> & { bulletsJson?: string[] }): Promise<PaintingPackRow> {
  const res = await apiRequest('PUT', `/api/admin/painting-packs/${id}`, data);
  return res.json();
}

export async function togglePaintingPackActive(id: string, isActive: boolean): Promise<PaintingPackRow> {
  const res = await apiRequest('PATCH', `/api/admin/painting-packs/${id}/active`, { isActive });
  return res.json();
}

export async function deletePaintingPack(id: string): Promise<void> {
  await apiRequest('DELETE', `/api/admin/painting-packs/${id}`);
}

// ============================================================
// FC CATALOG
// ============================================================

export interface FCCatalogFilters {
  q?: string;
  active?: string;
}

export async function getFCCatalog(filters?: FCCatalogFilters): Promise<FCCatalogRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.active && filters.active !== '' && filters.active !== 'all') {
    params.append('active', filters.active);
  }
  
  const queryString = params.toString();
  const url = `/api/admin/fc-catalog${queryString ? `?${queryString}` : ''}`;
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch FC catalog: ${res.statusText}`);
  return res.json();
}

export async function createFCCatalogItem(data: NewFCCatalogRow): Promise<FCCatalogRow> {
  const res = await apiRequest('POST', '/api/admin/fc-catalog', data);
  return res.json();
}

export async function updateFCCatalogItem(id: string, data: Partial<Omit<FCCatalogRow, 'id' | 'key' | 'createdAt' | 'updatedAt'>>): Promise<FCCatalogRow> {
  const res = await apiRequest('PUT', `/api/admin/fc-catalog/${id}`, data);
  return res.json();
}

export async function toggleFCCatalogItemActive(id: string, isActive: boolean): Promise<FCCatalogRow> {
  const res = await apiRequest('PATCH', `/api/admin/fc-catalog/${id}/active`, { isActive });
  return res.json();
}

export async function deleteFCCatalogItem(id: string): Promise<void> {
  await apiRequest('DELETE', `/api/admin/fc-catalog/${id}`);
}
