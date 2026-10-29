/** Named windows the profit screen offers; `custom` carries its own dates. */
export type ProfitPeriod = 'today' | 'week' | 'month' | 'custom';

export interface ProfitQuery {
  office_id?: string;
  period?: ProfitPeriod;
  date_from?: string;
  date_to?: string;
  tz?: string;
}

/** One column of the chart: an hour for today, a day for longer windows. */
export interface ProfitPoint {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProfitTotals {
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  /** revenue less the cost of goods — before the shop's own bills */
  profit: number;
  /** rent, wages and the rest, over the same window */
  expenses: number;
  /** what the owner keeps: profit less those expenses */
  net_profit: number;
  /** profit as a share of revenue, 0-100 */
  margin: number;
  /**
   * Units sold whose product has no cost price. They cost nothing in the
   * maths, so the profit reads high and the screen says so.
   */
  uncosted_units: number;
}

export interface ProfitEarner {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ProfitReport {
  period: {
    key: string;
    label: string;
    from: string;
    to: string;
    tz: string;
    bucket: 'hour' | 'day';
  };
  totals: ProfitTotals;
  /** the window of the same length just before this one */
  previous: ProfitTotals;
  /** percent change against that window; null when it had nothing to compare */
  change: { revenue: number | null; profit: number | null; net_profit: number | null };
  /** where the expenses went, biggest first */
  expense_breakdown: { category: string; amount: number }[];
  series: ProfitPoint[];
  top: ProfitEarner[];
  /** lines that sold at or below cost */
  losing: ProfitEarner[];
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
