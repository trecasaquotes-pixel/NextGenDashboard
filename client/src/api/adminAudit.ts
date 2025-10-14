export interface AuditLogListItem {
  id: string;
  userId: string;
  userEmail: string;
  section: string;
  action: string;
  targetId: string;
  summary: string;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  section: string;
  action: string;
  targetId: string;
  summary: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: Date;
}

export interface AuditLogListResponse {
  rows: AuditLogListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogFilters {
  q?: string;
  section?: "Rates" | "Templates" | "Brands" | "Painting&FC" | "GlobalRules";
  action?: "CREATE" | "UPDATE" | "DELETE";
  since?: number; // Unix timestamp (ms)
  until?: number; // Unix timestamp (ms)
  page?: number;
  pageSize?: number;
}

/**
 * List audit logs with optional filters and pagination
 */
export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  
  if (filters.q) params.append('q', filters.q);
  if (filters.section) params.append('section', filters.section);
  if (filters.action) params.append('action', filters.action);
  if (filters.since) params.append('since', filters.since.toString());
  if (filters.until) params.append('until', filters.until.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
  
  const response = await fetch(`/api/admin/audit?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch audit logs');
  }
  
  return response.json();
}

/**
 * Get a single audit log entry with full JSON
 */
export async function getAuditLog(id: string): Promise<AuditLogEntry> {
  const response = await fetch(`/api/admin/audit/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch audit log entry');
  }
  
  return response.json();
}
