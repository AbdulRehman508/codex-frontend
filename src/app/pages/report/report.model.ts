export type ReportKey =
  | 'sales'
  | 'products'
  | 'stock'
  | 'receivables'
  | 'payables'
  | 'expiry';

/** Every report answers with the same envelope: a page of rows + totals. */
export interface ReportPage<TRow, TSummary> {
  data: TRow[];
  total: number;
  page: number;
  limit: number;
  summary: TSummary;
}

export interface SalesReportRow {
  id: string;
  invoice_no: string;
  created_at: string | null;
  customer_name: string;
  items_count: number;
  payment_method: string;
  status: string;
  subtotal: number;
  discount: number;
  /** sales tax on this bill */
  tax_amount: number;
  total: number;
  paid_amount: number;
  borrow_amount: number;
}

export interface SalesReportSummary {
  orders: number;
  gross: number;
  discount: number;
  /** sales tax charged across the period */
  tax: number;
  net: number;
  paid: number;
  borrow: number;
  average_order: number;
  refunded: number;
}

export interface ProductReportRow {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
  orders: number;
  average_price: number;
  /** units sold x the product's latest landed cost */
  cost: number;
  /** revenue - cost */
  profit: number;
  /** profit as a share of revenue, 0-100 */
  margin: number;
}

export interface ProductReportSummary {
  products: number;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface StockReportRow {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  /** this product's own reorder level, 0 when it uses the office-wide one */
  min_stock: number;
  price: number;
  cost_price: number;
  /** quantity x sell price */
  stock_value: number;
  /** quantity x landed cost — what the shelf is actually worth */
  cost_value: number;
  status: string;
  location_code: string | null;
}

export interface StockReportSummary {
  products: number;
  units: number;
  stock_value: number;
  /** inventory valued at cost, the figure an owner books */
  cost_value: number;
  low_stock: number;
  out_of_stock: number;
}

export interface ReceivableRow {
  id: string;
  name: string;
  mobile_no: string;
  borrow_amount: number;
  borrowed_in_period: number;
  paid_in_period: number;
}

export interface ReceivableSummary {
  customers: number;
  outstanding: number;
  borrowed_in_period: number;
  paid_in_period: number;
}

export interface PayableRow {
  id: string;
  name: string;
  company: string;
  mobile_no: string;
  payable_amount: number;
  purchased_in_period: number;
  paid_in_period: number;
}

export interface PayableSummary {
  suppliers: number;
  outstanding: number;
  purchased_in_period: number;
  paid_in_period: number;
}

export interface ExpiryRow {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  batch_no: string;
  expiry_date: string | null;
  /** days left; negative once the date has passed */
  days_left: number | null;
  quantity: number;
  cost_price: number;
  cost_value: number;
  purchase_no: string;
  supplier_name: string;
  received_at: string | null;
}

export interface ExpirySummary {
  lots: number;
  units: number;
  cost_value: number;
  expired_lots: number;
  expired_units: number;
}

/** Any row a report table can render. */
export type ReportRow =
  | SalesReportRow
  | ProductReportRow
  | StockReportRow
  | ReceivableRow
  | PayableRow
  | ExpiryRow;

export interface ReportQuery {
  page?: number;
  limit?: number;
  office_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  // sales only
  status?: string;
  payment_method?: string;
  borrow_only?: boolean;
  // stock only
  low_only?: boolean;
  low_stock?: number;
  // expiry only
  within_days?: number;
  expired_only?: boolean;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
