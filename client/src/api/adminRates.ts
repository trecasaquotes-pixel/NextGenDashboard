import { apiRequest } from "@/lib/queryClient";
import type { RateRow, NewRateRow } from "@shared/schema";

export interface RatesFilters {
  q?: string;
  unit?: string;
  category?: string;
  active?: string;
}

export async function getRates(filters?: RatesFilters): Promise<RateRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.unit) params.append('unit', filters.unit);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.active !== undefined) params.append('active', filters.active);
  
  const queryString = params.toString();
  const url = `/api/admin/rates${queryString ? `?${queryString}` : ''}`;
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch rates: ${res.statusText}`);
  return res.json();
}

export async function createRate(data: NewRateRow): Promise<RateRow> {
  const res = await apiRequest('POST', '/api/admin/rates', data);
  return res.json();
}

export async function updateRate(id: string, data: Partial<Omit<RateRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RateRow> {
  const res = await apiRequest('PUT', `/api/admin/rates/${id}`, data);
  return res.json();
}

export async function toggleRateActive(id: string, isActive: boolean): Promise<RateRow> {
  const res = await apiRequest('PATCH', `/api/admin/rates/${id}/active`, { isActive });
  return res.json();
}

export async function deleteRate(id: string): Promise<RateRow> {
  const res = await apiRequest('DELETE', `/api/admin/rates/${id}`);
  return res.json();
}

// Helper function to check if a rate has a locked unit (based on itemKey)
export function isUnitLocked(itemKey: string): boolean {
  const lsumOnly = ['termite_treatment', 'floor_matting', 'transportation_handling', 'fc_paint'];
  const countOnly = ['fc_lights', 'fc_fan_hook', 'fc_cove_led'];
  
  return lsumOnly.includes(itemKey) || countOnly.includes(itemKey);
}

// Get the locked unit for a specific itemKey
export function getLockedUnit(itemKey: string): 'SFT' | 'COUNT' | 'LSUM' | null {
  const lsumOnly = ['termite_treatment', 'floor_matting', 'transportation_handling', 'fc_paint'];
  const countOnly = ['fc_lights', 'fc_fan_hook', 'fc_cove_led'];
  
  if (lsumOnly.includes(itemKey)) return 'LSUM';
  if (countOnly.includes(itemKey)) return 'COUNT';
  return null;
}
