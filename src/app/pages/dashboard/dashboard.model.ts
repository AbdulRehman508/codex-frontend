export type Granularity = 'hour' | 'day';

/** A figure for the selected period next to the same window a period earlier. */
export interface Compared {
  value: number;
  previous: number;
}

export interface DashboardOverview {
  range: { from: string; to: string; granularity: Granularity; tz: string };
  kpis: {
    revenue: Compared;
    orders: Compared;
    new_customers: Compared;
    refunds: Compared;
    /** what customers owe right now — a balance, not a period figure */
    outstanding_borrow: number;
  };
  /** only buckets that had sales; the page fills the empty ones */
  trend: { bucket: string; revenue: number; orders: number }[];
  payment_mix: { cash: number; online: number };
  top_products: {
    product_id: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  recent_orders: {
    id: string;
    invoice_no: string;
    customer_name: string;
    items_count: number;
    total: number;
    status: 'completed' | 'pending' | 'refunded';
    created_at: string | null;
  }[];
  low_stock: { id: string; name: string; sku: string; quantity: number }[];
}

export interface DashboardQuery {
  office_id?: string;
  date_from?: string;
  date_to?: string;
  tz?: string;
  low_stock?: number;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
