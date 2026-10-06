import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  AdjustmentListQuery,
  ApiSuccess,
  CreateAdjustmentDto,
  PaginatedAdjustments,
  StockAdjustment,
} from './stock.model';

/**
 * Typed Stock API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class StockApiService {
  private api = inject(ApiService);
  private endpoint = 'stock/adjustments';

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
}
