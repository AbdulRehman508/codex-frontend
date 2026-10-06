export type SupplierStatus = 'active' | 'inactive';
export type PurchaseStatus = 'received' | 'ordered' | 'cancelled';

/** Who the shop buys from. `payable_amount` is what this branch still owes. */
export interface Supplier {
  id: string;
  office_id: string;
  name: string;
  company: string;
  mobile_no: string;
  email: string | null;
  address: string;
  notes: string;
  payable_amount: number;
  status: SupplierStatus;
  created_at: string;
  updated_at: string;
}

export interface SupplierListRow {
  id: string;
  name: string;
  company: string;
  mobile_no: string;
  email: string | null;
  payable_amount: number;
  status: SupplierStatus;
}

export interface CreateSupplierDto {
  office_id: string;
  name: string;
  company?: string;
  mobile_no: string;
  email?: string | null;
  address?: string;
  notes?: string;
  status?: SupplierStatus;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>;

/** One received line — cost_price is what it cost, not the sell price. */
export interface PurchaseLine {
  product_id: string;
  name: string;
  sku: string;
  cost_price: number;
  quantity: number;
  total: number;
}

export interface Purchase {
  id: string;
  office_id: string;
  purchase_no: string;
  supplier_id: string;
  supplier_name: string;
  supplier_invoice_no: string;
  lines: PurchaseLine[];
  items_count: number;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  status: PurchaseStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseListRow {
  id: string;
  purchase_no: string;
  supplier_name: string;
  supplier_invoice_no: string;
  items_count: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  status: PurchaseStatus;
  created_at: string | null;
}

export interface CreatePurchaseDto {
  office_id: string;
  supplier_id: string;
  supplier_invoice_no?: string;
  lines: { product_id: string; quantity: number; cost_price: number }[];
  discount?: number;
  paid_amount?: number;
  status?: PurchaseStatus;
  notes?: string;
}

export interface PurchaseStats {
  purchases: number;
  total: number;
  paid: number;
  due: number;
}

export interface SupplierListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  status?: SupplierStatus;
  sort?: 'name' | 'company' | 'mobile_no' | 'payable_amount' | 'status' | 'created_at';
  order?: 'asc' | 'desc';
}

export interface PurchaseListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  supplier_id?: string;
  status?: PurchaseStatus;
  due_only?: boolean;
  date_from?: string;
  date_to?: string;
  sort?:
    | 'purchase_no'
    | 'supplier_name'
    | 'items_count'
    | 'total'
    | 'paid_amount'
    | 'due_amount'
    | 'status'
    | 'created_at';
  order?: 'asc' | 'desc';
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedPurchases extends Paginated<PurchaseListRow> {
  summary: PurchaseStats;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
