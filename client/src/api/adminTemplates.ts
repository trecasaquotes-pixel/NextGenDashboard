import { apiRequest } from "@/lib/queryClient";
import type { 
  TemplateRow, 
  NewTemplateRow, 
  TemplateRoomRow, 
  NewTemplateRoomRow, 
  TemplateItemRow, 
  NewTemplateItemRow 
} from "@shared/schema";

export interface TemplatesFilters {
  q?: string;
  category?: string;
  active?: string;
}

export interface TemplateWithRooms extends TemplateRow {
  rooms: (TemplateRoomRow & { items: TemplateItemRow[] })[];
}

// Templates
export async function getTemplates(filters?: TemplatesFilters): Promise<TemplateRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  // Only add category param if it has a real value (not "all" or empty)
  if (filters?.category && filters.category !== 'all' && filters.category !== '') {
    params.append('category', filters.category);
  }
  // Only add active param if it has a real value (not "all", empty string, or undefined)
  if (filters?.active && filters.active !== '' && filters.active !== 'all') {
    params.append('active', filters.active);
  }
  
  const queryString = params.toString();
  const url = `/api/admin/templates${queryString ? `?${queryString}` : ''}`;
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.statusText}`);
  return res.json();
}

export async function getTemplate(id: string): Promise<TemplateWithRooms> {
  const res = await fetch(`/api/admin/templates/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
  return res.json();
}

export async function createTemplate(data: NewTemplateRow): Promise<TemplateRow> {
  const res = await apiRequest('POST', '/api/admin/templates', data);
  return res.json();
}

export async function updateTemplate(id: string, data: Partial<Omit<TemplateRow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TemplateRow> {
  const res = await apiRequest('PUT', `/api/admin/templates/${id}`, data);
  return res.json();
}

export async function deleteTemplate(id: string): Promise<TemplateRow> {
  const res = await apiRequest('DELETE', `/api/admin/templates/${id}`);
  return res.json();
}

export async function duplicateTemplate(id: string): Promise<TemplateRow> {
  const res = await apiRequest('POST', `/api/admin/templates/${id}/duplicate`, {});
  return res.json();
}

// Rooms
export async function createTemplateRoom(templateId: string, data: Omit<NewTemplateRoomRow, 'templateId'>): Promise<TemplateRoomRow> {
  const res = await apiRequest('POST', `/api/admin/templates/${templateId}/rooms`, data);
  return res.json();
}

export async function updateTemplateRoom(templateId: string, roomId: string, data: Partial<Omit<TemplateRoomRow, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>>): Promise<TemplateRoomRow> {
  const res = await apiRequest('PUT', `/api/admin/templates/${templateId}/rooms/${roomId}`, data);
  return res.json();
}

export async function deleteTemplateRoom(templateId: string, roomId: string): Promise<void> {
  await apiRequest('DELETE', `/api/admin/templates/${templateId}/rooms/${roomId}`, {});
}

// Items
export async function createTemplateItem(templateId: string, roomId: string, data: Omit<NewTemplateItemRow, 'templateRoomId'>): Promise<TemplateItemRow> {
  const res = await apiRequest('POST', `/api/admin/templates/${templateId}/rooms/${roomId}/items`, data);
  return res.json();
}

export async function updateTemplateItem(templateId: string, roomId: string, itemId: string, data: Partial<Omit<TemplateItemRow, 'id' | 'templateRoomId' | 'createdAt' | 'updatedAt'>>): Promise<TemplateItemRow> {
  const res = await apiRequest('PUT', `/api/admin/templates/${templateId}/rooms/${roomId}/items/${itemId}`, data);
  return res.json();
}

export async function deleteTemplateItem(templateId: string, roomId: string, itemId: string): Promise<void> {
  await apiRequest('DELETE', `/api/admin/templates/${templateId}/rooms/${roomId}/items/${itemId}`, {});
}

// Import/Export
export async function importTemplate(json: any): Promise<TemplateRow> {
  const res = await apiRequest('POST', '/api/admin/templates/import', { json });
  return res.json();
}

export async function exportTemplate(id: string): Promise<any> {
  const res = await fetch(`/api/admin/templates/${id}/export`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to export template: ${res.statusText}`);
  return res.json();
}
