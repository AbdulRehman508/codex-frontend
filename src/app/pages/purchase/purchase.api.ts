import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  ApiSuccess,
  CreatePurchaseDto,
  CreateSupplierDto,
  Paginated,
  PaginatedPurchases,
  Purchase,
  PurchaseListQuery,
  Supplier,
  SupplierListQuery,
  SupplierListRow,
  UpdateSupplierDto,
} from './purchase.model';

/**
 * Typed Purchase + Supplier API client. Delegates HTTP to the generic
 * ApiService and unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseApiService {
  private api = inject(ApiService);

  // ---------- suppliers ----------

  listSuppliers(params: SupplierListQuery = {}): Observable<Paginated<SupplierListRow>> {
    return this.api
      .getAll<ApiSuccess<Paginated<SupplierListRow>>>('suppliers', params)
      .pipe(map((res) => res.data));
  }

  getSupplier(id: string, officeId?: string): Observable<Supplier> {
    return this.api
      .getAll<ApiSuccess<Supplier>>(`suppliers/${id}`, { office_id: officeId })
      .pipe(map((res) => res.data));
  }

  createSupplier(body: CreateSupplierDto): Observable<Supplier> {
    return this.api
      .create<ApiSuccess<Supplier>>('suppliers', body)
      .pipe(map((res) => res.data));
  }

  updateSupplier(id: string, body: CreateSupplierDto): Observable<Supplier> {
    return this.api
      .update<ApiSuccess<Supplier>>('suppliers', id, body)
      .pipe(map((res) => res.data));
  }

  patchSupplier(id: string, partial: UpdateSupplierDto): Observable<Supplier> {
    return this.api
      .patch<ApiSuccess<Supplier>>('suppliers', id, partial)
      .pipe(map((res) => res.data));
  }

  /** Pay a supplier; returns the supplier with the new balance. */
  paySupplier(id: string, amount: number, note?: string): Observable<Supplier> {
    return this.api
      .create<ApiSuccess<{ supplier: Supplier }>>(`suppliers/${id}/payments`, {
        amount,
        note,
      })
      .pipe(map((res) => res.data.supplier));
  }

  deleteSupplier(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>('suppliers', id)
      .pipe(map((res) => res.data));
  }

  // ---------- purchases ----------

  listPurchases(params: PurchaseListQuery = {}): Observable<PaginatedPurchases> {
    return this.api
      .getAll<ApiSuccess<PaginatedPurchases>>('purchases', params)
      .pipe(map((res) => res.data));
  }

  getPurchase(id: string, officeId?: string): Observable<Purchase> {
    return this.api
      .getAll<ApiSuccess<Purchase>>(`purchases/${id}`, { office_id: officeId })
      .pipe(map((res) => res.data));
  }

  createPurchase(body: CreatePurchaseDto): Observable<Purchase> {
    return this.api
      .create<ApiSuccess<Purchase>>('purchases', body)
      .pipe(map((res) => res.data));
  }

  updatePurchase(id: string, body: CreatePurchaseDto): Observable<Purchase> {
    return this.api
      .update<ApiSuccess<Purchase>>('purchases', id, body)
      .pipe(map((res) => res.data));
  }

  deletePurchase(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>('purchases', id)
      .pipe(map((res) => res.data));
  }
}
