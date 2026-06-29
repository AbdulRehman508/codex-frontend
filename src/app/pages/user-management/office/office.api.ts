import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiSuccess,
  CreateOfficeDto,
  Office,
  OfficeListQuery,
  PaginatedOffices,
  UpdateOfficeDto,
} from './office.model';

/**
 * Typed Office API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 * Auth header is added globally by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class OfficeApiService {
  private api = inject(ApiService);
  private endpoint = 'offices';

  listOffices(params: OfficeListQuery = {}): Observable<PaginatedOffices> {
    return this.api
      .getAll<ApiSuccess<PaginatedOffices>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getOffice(id: string): Observable<Office> {
    return this.api.getById<ApiSuccess<Office>>(this.endpoint, id).pipe(map((res) => res.data));
  }

  createOffice(body: CreateOfficeDto): Observable<Office> {
    return this.api.create<ApiSuccess<Office>>(this.endpoint, body).pipe(map((res) => res.data));
  }

  /** Full update (PUT) — send the whole object. */
  updateOffice(id: string, body: CreateOfficeDto): Observable<Office> {
    return this.api.update<ApiSuccess<Office>>(this.endpoint, id, body).pipe(map((res) => res.data));
  }

  /** Partial update (PATCH) — e.g. toggle approved / office_status. */
  patchOffice(id: string, partial: UpdateOfficeDto): Observable<Office> {
    return this.api.patch<ApiSuccess<Office>>(this.endpoint, id, partial).pipe(map((res) => res.data));
  }

  deleteOffice(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }

  bulkDeleteOffices(ids: string[]): Observable<{ deleted_count: number }> {
    return this.api
      .deleteBody<ApiSuccess<{ deleted_count: number }>>(this.endpoint, { ids })
      .pipe(map((res) => res.data));
  }
}
