/** One day's close-out, the way a shopkeeper counts at closing time. */
export interface DayClose {
  date: string;
  tz: string;
  from: string;
  to: string;
  sales: {
    orders: number;
    gross: number;
    discount: number;
    tax: number;
    net: number;
    refunds: number;
    refunded: number;
  };
  payments: {
    cash: number;
    cash_orders: number;
    online: number;
    online_orders: number;
    collected: number;
    credit_given: number;
    customer_repayments: number;
    repayment_count: number;
  };
  purchases: {
    bills: number;
    total: number;
    paid: number;
    supplier_payments: number;
    payment_count: number;
  };
  stock: { adjustments: number; transfers: number };
  /** cash taken plus debts settled, less what went to suppliers */
  cash_drawer: { in: number; out: number; expected: number };
}

export interface DayCloseQuery {
  office_id?: string;
  /** yyyy-MM-dd; defaults to today */
  date?: string;
  tz?: string;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
