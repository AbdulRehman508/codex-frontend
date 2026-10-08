import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  AdjustmentListQuery,
  ApiSuccess,
  CreateAdjustmentDto,
  CreateTransferDto,
  PaginatedAdjustments,
  PaginatedTransfers,
  StockAdjustment,
  StockTransfer,
  TransferListQuery,
} from './stock.model';

/**
 * Typed Stock API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class StockApiService {
  private api = inject(ApiService);
  private endpoint = 'stock/adjustments';
  private transfers = 'stock/transfers';

  listAdjustments(
    params: AdjustmentListQuery = {},
  ): Observable<PaginatedAdjustments> {
    return this.api
      .getAll<ApiSuccess<PaginatedAdjustments>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getAdjustment(id: string, officeId?: string): Observable<StockAdjustment> {
    return this.api
      .getAll<ApiSuccess<StockAdjustment>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  /** Entries are never edited: a mistake is fixed by posting the opposite one. */
  createAdjustment(body: CreateAdjustmentDto): Observable<StockAdjustment> {
    return this.api
      .create<ApiSuccess<StockAdjustment>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  // ---------- branch-to-branch transfers ----------

  listTransfers(params: TransferListQuery = {}): Observable<PaginatedTransfers> {
    return this.api
      .getAll<ApiSuccess<PaginatedTransfers>>(this.transfers, params)
      .pipe(map((res) => res.data));
  }

  getTransfer(id: string, officeId?: string): Observable<StockTransfer> {
    return this.api
      .getAll<ApiSuccess<StockTransfer>>(`${this.transfers}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  createTransfer(body: CreateTransferDto): Observable<StockTransfer> {
    return this.api
      .create<ApiSuccess<StockTransfer>>(this.transfers, body)
      .pipe(map((res) => res.data));
  }

  /** Send a transfer back; refused once the far branch has sold the stock. */
  reverseTransfer(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.transfers, id)
      .pipe(map((res) => res.data));
  }
}
