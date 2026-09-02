import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  ApiSuccess,
  CreateSaleDto,
  PaginatedSales,
  Sale,
  SaleListQuery,
  SaleStats,
  UpdateSaleDto,
} from './sales.model';

/**
 * Typed Sales API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class SalesApiService {
  private api = inject(ApiService);
  private endpoint = 'sales';

  listSales(params: SaleListQuery = {}): Observable<PaginatedSales> {
    return this.api
      .getAll<ApiSuccess<PaginatedSales>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  /** Today's takings / transaction count / average order. */
  getStats(officeId?: string): Observable<SaleStats> {
    return this.api
      .getAll<ApiSuccess<SaleStats>>(`${this.endpoint}/stats`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  /** Full sale with its lines — used by edit and by the printed receipt. */
  getSale(id: string, officeId?: string): Observable<Sale> {
    return this.api
      .getAll<ApiSuccess<Sale>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  createSale(body: CreateSaleDto): Observable<Sale> {
    return this.api
      .create<ApiSuccess<Sale>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  updateSale(id: string, body: CreateSaleDto): Observable<Sale> {
    return this.api
      .update<ApiSuccess<Sale>>(this.endpoint, id, body)
      .pipe(map((res) => res.data));
  }

  /** Partial update — mainly the status (refund gives the stock back). */
  patchSale(id: string, partial: UpdateSaleDto): Observable<Sale> {
    return this.api
      .patch<ApiSuccess<Sale>>(this.endpoint, id, partial)
      .pipe(map((res) => res.data));
  }

  deleteSale(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }
}
