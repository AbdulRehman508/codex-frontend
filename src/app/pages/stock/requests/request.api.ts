import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiSuccess,
  AvailableProduct,
  CreateRequestDto,
  PaginatedRequests,
  RequestListQuery,
  StockRequest,
} from './request.model';

/**
 * Typed client for branch-to-branch stock requests. Delegates HTTP to the
 * generic ApiService and unwraps the response envelope.
 */
@Injectable({ providedIn: 'root' })
export class RequestApiService {
  private api = inject(ApiService);
  private endpoint = 'stock/requests';

  list(params: RequestListQuery = {}): Observable<PaginatedRequests> {
    return this.api
      .getAll<ApiSuccess<PaginatedRequests>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getOne(id: string, officeId?: string): Observable<StockRequest> {
    return this.api
      .getAll<ApiSuccess<StockRequest>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  /**
   * What the other branch has on the shelf. Scoped on the server to name, SKU
   * and the count — a requester is not assigned to that office.
   */
  available(
    sourceOfficeId: string,
    search: string,
    limit = 20,
  ): Observable<AvailableProduct[]> {
    return this.api
      .getAll<ApiSuccess<AvailableProduct[]>>(`${this.endpoint}/available`, {
        source_office_id: sourceOfficeId,
        search,
        limit,
      })
      .pipe(map((res) => res.data));
  }

  /** Asking moves nothing; the other branch has to approve first. */
  create(body: CreateRequestDto): Observable<StockRequest> {
    return this.api
      .create<ApiSuccess<StockRequest>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  approve(id: string, officeId: string): Observable<StockRequest> {
    return this.api
      .patchTo<ApiSuccess<StockRequest>>(
        `${this.endpoint}/${id}/approve`,
        {},
        { office_id: officeId },
      )
      .pipe(map((res) => res.data));
  }

  decline(id: string, officeId: string, reason: string): Observable<StockRequest> {
    return this.api
      .patchTo<ApiSuccess<StockRequest>>(
        `${this.endpoint}/${id}/decline`,
        { reason },
        { office_id: officeId },
      )
      .pipe(map((res) => res.data));
  }

  cancel(id: string, officeId: string): Observable<StockRequest> {
    return this.api
      .patchTo<ApiSuccess<StockRequest>>(
        `${this.endpoint}/${id}/cancel`,
        {},
        { office_id: officeId },
      )
      .pipe(map((res) => res.data));
  }
}
