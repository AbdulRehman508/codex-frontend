export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'other';

/** One recorded change: who touched what, and when. */
export interface AuditRow {
  id: string;
  created_at: string | null;
  user_name: string;
  user_email: string;
  /** access-catalog key: products, sales, purchase, stock ... */
  module: string;
  action: AuditAction;
  entity_label: string;
  entity_id: string;
  method: string;
  path: string;
  status_code: number;
  ip: string;
}

export interface AuditListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  user_id?: string;
  module?: string;
  action?: AuditAction;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedAudit {
  data: AuditRow[];
  total: number;
  page: number;
  limit: number;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
