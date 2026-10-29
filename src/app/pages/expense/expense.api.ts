import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  ApiSuccess,
  CreateExpenseDto,
  CreateRecurringDto,
  Expense,
  ExpenseListQuery,
  PaginatedExpenses,
  RecurringExpense,
  UpdateExpenseDto,
} from './expense.model';

/**
 * Typed Expense API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseApiService {
  private api = inject(ApiService);
  private endpoint = 'expenses';

  list(params: ExpenseListQuery = {}): Observable<PaginatedExpenses> {
    return this.api
      .getAll<ApiSuccess<PaginatedExpenses>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  /** The starter categories plus the ones this branch already uses. */
  categories(officeId?: string): Observable<string[]> {
    return this.api
      .getAll<ApiSuccess<string[]>>(`${this.endpoint}/categories`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  getOne(id: string, officeId?: string): Observable<Expense> {
    return this.api
      .getAll<ApiSuccess<Expense>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  create(body: CreateExpenseDto): Observable<Expense> {
    return this.api
      .create<ApiSuccess<Expense>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  update(id: string, body: UpdateExpenseDto): Observable<Expense> {
    return this.api
      .patch<ApiSuccess<Expense>>(this.endpoint, id, body)
      .pipe(map((res) => res.data));
  }

  // ---------- bills that come round again ----------

  /**
   * Reading this also writes any standing bill that has fallen due, so the
   * list is never missing a rent nobody typed in.
   */
  listRecurring(officeId?: string): Observable<RecurringExpense[]> {
    return this.api
      .getAll<ApiSuccess<RecurringExpense[]>>(`${this.endpoint}/recurring`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  createRecurring(body: CreateRecurringDto): Observable<RecurringExpense> {
    return this.api
      .create<ApiSuccess<RecurringExpense>>(`${this.endpoint}/recurring`, body)
      .pipe(map((res) => res.data));
  }

  updateRecurring(
    id: string,
    body: Partial<CreateRecurringDto>,
  ): Observable<RecurringExpense> {
    return this.api
      .patchTo<ApiSuccess<RecurringExpense>>(
        `${this.endpoint}/recurring/${id}`,
        body,
      )
      .pipe(map((res) => res.data));
  }

  removeRecurring(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(
        `${this.endpoint}/recurring`,
        id,
      )
      .pipe(map((res) => res.data));
  }

  /** Soft delete: it goes to the trash, like every other record. */
  remove(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }
}
