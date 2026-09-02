export type PaymentMethod = 'cash' | 'online';
export type SaleStatus = 'completed' | 'pending' | 'refunded';

/** One line of a sale — name/sku/price are snapshots taken at sale time. */
export interface SaleLine {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

/** Full sale returned by detail / create / update — what the receipt prints. */
export interface Sale {
  id: string;
  office_id: string;
  invoice_no: string;
  customer_name: string;
  payment_method: PaymentMethod;
  lines: SaleLine[];
  items_count: number;
  subtotal: number;
  discount: number;
  total: number;
  status: SaleStatus;
  sold_by: string | null;
  created_at: string;
  updated_at: string;
  /** shop details, returned by the detail call for the printed receipt */
  office_name?: string | null;
  office_address?: string | null;
  office_mobile_no?: string | null;
}

/** Slim row returned by the list endpoint. */
export interface SaleListRow {
  id: string;
  invoice_no: string;
  customer_name: string;
  items_count: number;
  payment_method: PaymentMethod;
  total: number;
  status: SaleStatus;
  created_at: string | null;
}

/** Body for POST / PUT. `price` per line is optional (product price wins). */
export interface CreateSaleDto {
  office_id: string;
  customer_name?: string;
  payment_method?: PaymentMethod;
  lines: { product_id: string; quantity: number; price?: number }[];
  discount?: number;
  status?: SaleStatus;
}

export type UpdateSaleDto = Partial<CreateSaleDto>;

export interface SaleStats {
  today_total: number;
  transactions: number;
  average_order: number;
}

export interface SaleListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  status?: SaleStatus;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
  sort?:
    | 'invoice_no'
    | 'customer_name'
    | 'items_count'
    | 'payment_method'
    | 'total'
    | 'status'
    | 'created_at'
    | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedSales {
  data: SaleListRow[];
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
