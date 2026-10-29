export type ExpensePaymentMethod = 'cash' | 'online';

export interface Expense {
  id: string;
  expense_no: string;
  office_id: string;
  category: string;
  amount: number;
  payment_method: ExpensePaymentMethod;
  spent_at: string | null;
  paid_to: string;
  note: string;
  /** the photographed bill, when there is one */
  receipt: string | null;
  created_at?: string;
}

export type RecurringFrequency = 'weekly' | 'monthly';

/** A bill that comes round again: rent on the 1st, wages on the 5th. */
export interface RecurringExpense {
  id: string;
  office_id: string;
  category: string;
  amount: number;
  payment_method: ExpensePaymentMethod;
  paid_to: string;
  note: string;
  frequency: RecurringFrequency;
  /** 1-31 for monthly, 0 (Sunday) to 6 for weekly */
  day: number;
  next_run: string | null;
  last_run: string | null;
  active: boolean;
}

export interface CreateRecurringDto {
  office_id: string;
  category: string;
  amount: number;
  payment_method?: ExpensePaymentMethod;
  paid_to?: string;
  note?: string;
  frequency?: RecurringFrequency;
  day: number;
  /** first date it is due; a past one backfills */
  start_from?: string;
  active?: boolean;
}

/** Slim row for the grid — the same shape the list endpoint returns. */
export type ExpenseRow = Expense & { created_at: string | null };

export interface ExpenseSummary {
  entries: number;
  total: number;
  /** the part that came out of the till */
  cash: number;
  online: number;
  by_category: { category: string; amount: number; entries: number }[];
}

export interface ExpenseListQuery {
  page?: number;
  limit?: number;
  office_id?: string;
  category?: string;
  payment_method?: ExpensePaymentMethod;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedExpenses {
  data: ExpenseRow[];
  total: number;
  page: number;
  limit: number;
  summary: ExpenseSummary;
}

export interface CreateExpenseDto {
  office_id: string;
  category: string;
  amount: number;
  payment_method?: ExpensePaymentMethod;
  spent_at?: string;
  paid_to?: string;
  note?: string;
  /** base64 data URL on write; '' clears it */
  receipt?: string;
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>;

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
