import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiSuccess,
  CreateCustomerDto,
  Customer,
  CustomerListQuery,
  PaginatedCustomers,
  UpdateCustomerDto,
} from './customer.model';

/**
 * Typed Customer API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private api = inject(ApiService);
  private endpoint = 'customers';

  listCustomers(params: CustomerListQuery = {}): Observable<PaginatedCustomers> {
    return this.api
      .getAll<ApiSuccess<PaginatedCustomers>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getCustomer(id: string, officeId?: string): Observable<Customer> {
    return this.api
      .getAll<ApiSuccess<Customer>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  createCustomer(body: CreateCustomerDto): Observable<Customer> {
    return this.api
      .create<ApiSuccess<Customer>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  /** Full update (PUT) — send the whole object. */
  updateCustomer(id: string, body: CreateCustomerDto): Observable<Customer> {
    return this.api
      .update<ApiSuccess<Customer>>(this.endpoint, id, body)
      .pipe(map((res) => res.data));
  }

  /** Partial update (PATCH) — e.g. toggle customer_status. */
  patchCustomer(id: string, partial: UpdateCustomerDto): Observable<Customer> {
    return this.api
      .patch<ApiSuccess<Customer>>(this.endpoint, id, partial)
      .pipe(map((res) => res.data));
  }

  /** Customer paid towards their borrow; returns the updated customer. */
  receivePayment(id: string, amount: number, note?: string): Observable<Customer> {
    return this.api
      .create<ApiSuccess<{ customer: Customer }>>(`${this.endpoint}/${id}/payments`, {
        amount,
        note,
      })
      .pipe(map((res) => res.data.customer));
  }

  deleteCustomer(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }

  bulkDeleteCustomers(ids: string[]): Observable<{ deleted_count: number }> {
    return this.api
      .deleteBody<ApiSuccess<{ deleted_count: number }>>(this.endpoint, { ids })
      .pipe(map((res) => res.data));
  }
}
