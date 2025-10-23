import { apiRequest } from "@/lib/queryClient";
import type { BrandRow, NewBrandRow } from "@shared/schema";

export interface BrandsFilters {
  q?: string;
  type?: string;
  active?: string;
}

export async function getBrands(filters?: BrandsFilters): Promise<BrandRow[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.type && filters.type !== "all" && filters.type !== "") {
    params.append("type", filters.type);
  }
  if (filters?.active && filters.active !== "" && filters.active !== "all") {
    params.append("active", filters.active);
  }

  const queryString = params.toString();
  const url = `/api/admin/brands${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch brands: ${res.statusText}`);
  return res.json();
}

export async function createBrand(data: NewBrandRow): Promise<BrandRow> {
  const res = await apiRequest("POST", "/api/admin/brands", data);
  return res.json();
}

export async function updateBrand(
  id: string,
  data: Partial<Omit<BrandRow, "id" | "type" | "createdAt" | "updatedAt">>,
): Promise<BrandRow> {
  const res = await apiRequest("PUT", `/api/admin/brands/${id}`, data);
  return res.json();
}

export async function setDefaultBrand(id: string): Promise<BrandRow> {
  const res = await apiRequest("PATCH", `/api/admin/brands/${id}/default`, {});
  return res.json();
}

export async function toggleBrandActive(id: string, isActive: boolean): Promise<BrandRow> {
  const res = await apiRequest("PATCH", `/api/admin/brands/${id}/active`, { isActive });
  return res.json();
}

export async function deleteBrand(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/admin/brands/${id}`);
}
