/** Record kinds the bin can hold — ledger records are reversed, not restored. */
export type TrashModule =
  | 'products'
  | 'customer'
  | 'supplier'
  | 'staff'
  | 'office'
  | 'location';

export interface TrashRow {
  id: string;
  module: TrashModule;
  module_label: string;
  label: string;
  sub_label: string;
  office_id: string | null;
  deleted_at: string | null;
}

export interface TrashListQuery {
  page?: number;
  limit?: number;
  module?: TrashModule;
  office_id?: string;
  search?: string;
}

export interface PaginatedTrash {
  data: TrashRow[];
  total: number;
  page: number;
  limit: number;
  /** how many sit in each kind, for the chips */
  counts: Record<string, number>;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
