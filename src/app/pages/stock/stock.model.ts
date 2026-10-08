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

// ---------- branch-to-branch transfers ----------

/** One product moving between branches. */
export interface TransferLine {
  product_id: string;
  to_product_id: string;
  name: string;
  sku: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  transfer_no: string;
  from_office_id: string;
  to_office_id: string;
  from_office_name: string;
  to_office_name: string;
  lines: TransferLine[];
  items_count: number;
  units: number;
  note: string;
  created_at: string | null;
}

export interface TransferRow {
  id: string;
  transfer_no: string;
  from_office_id: string;
  to_office_id: string;
  from_office_name: string;
  to_office_name: string;
  items_count: number;
  units: number;
  note: string;
  /** true once the transfer has been sent back */
  reversed: boolean;
  created_at: string | null;
}

export interface CreateTransferDto {
  /** the sending office — named office_id so the API's scope guard sees it */
  office_id: string;
  to_office_id: string;
  lines: { product_id: string; quantity: number }[];
  note?: string;
}

export interface TransferSummary {
  transfers: number;
  units: number;
}

export interface TransferListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  /** with office_id: 'in' received only, 'out' sent only */
  direction?: 'in' | 'out';
  date_from?: string;
  date_to?: string;
  include_deleted?: boolean;
  sort?:
    | 'transfer_no'
    | 'from_office_name'
    | 'to_office_name'
    | 'items_count'
    | 'units'
    | 'created_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedTransfers {
  data: TransferRow[];
  total: number;
  page: number;
  limit: number;
  summary: TransferSummary;
}
