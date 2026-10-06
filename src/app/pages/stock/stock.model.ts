export type AdjustmentType = 'increase' | 'decrease' | 'recount';

export type AdjustmentReason =
  | 'damaged'
  | 'lost'
  | 'expired'
  | 'found'
  | 'return'
  | 'correction'
  | 'other';

/**
 * One stock movement that was neither a sale nor a purchase. Entries are an
 * audit trail: they are never edited — a mistake is corrected by posting the
 * opposite entry.
 */
export interface StockAdjustment {
  id: string;
  office_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  type: AdjustmentType;
  reason: AdjustmentReason;
  /** units moved, always positive — `type` carries the direction */
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  note: string;
  created_at: string | null;
}

export interface AdjustmentRow {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  type: AdjustmentType;
  reason: AdjustmentReason;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  note: string;
  created_at: string | null;
}

export interface CreateAdjustmentDto {
  office_id: string;
  product_id: string;
  type: AdjustmentType;
  reason: AdjustmentReason;
  /** units to add or remove; for a recount it is the counted total */
  quantity: number;
  note?: string;
}

export interface AdjustmentSummary {
  entries: number;
  units_in: number;
  units_out: number;
  net_units: number;
}

export interface AdjustmentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  product_id?: string;
  type?: AdjustmentType;
  reason?: AdjustmentReason;
  date_from?: string;
  date_to?: string;
  sort?:
    | 'product_name'
    | 'type'
    | 'reason'
    | 'quantity'
    | 'after_quantity'
    | 'created_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedAdjustments {
  data: AdjustmentRow[];
  total: number;
  page: number;
  limit: number;
  summary: AdjustmentSummary;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
