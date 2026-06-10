import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  ApiSuccess,
  CreateOfficeDto,
  Office,
  OfficeListQuery,
  PaginatedOffices,
  UpdateOfficeDto,
} from './office.model';

/**
 * Typed Office API client. Unwraps the response envelope and returns `data`.
 * Auth header is added globally by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class OfficeApiService {
  private http = inject(HttpClient);
  private base = `${environment.nestApiUrl}/offices`;

  listOffices(params: OfficeListQuery = {}): Observable<PaginatedOffices> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http
      .get<ApiSuccess<PaginatedOffices>>(this.base, { params: httpParams })
      .pipe(map((res) => res.data));
  }

  getOffice(id: string): Observable<Office> {
    return this.http.get<ApiSuccess<Office>>(`${this.base}/${id}`).pipe(map((res) => res.data));
  }

  createOffice(body: CreateOfficeDto): Observable<Office> {
    return this.http.post<ApiSuccess<Office>>(this.base, body).pipe(map((res) => res.data));
  }

  /** Full update (PUT) — send the whole object. */
  updateOffice(id: string, body: CreateOfficeDto): Observable<Office> {
    return this.http.put<ApiSuccess<Office>>(`${this.base}/${id}`, body).pipe(map((res) => res.data));
  }

  /** Partial update (PATCH) — e.g. toggle approved / office_status. */
  patchOffice(id: string, partial: UpdateOfficeDto): Observable<Office> {
    return this.http.patch<ApiSuccess<Office>>(`${this.base}/${id}`, partial).pipe(map((res) => res.data));
  }

  deleteOffice(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  bulkDeleteOffices(ids: string[]): Observable<{ deleted_count: number }> {
    return this.http
      .delete<ApiSuccess<{ deleted_count: number }>>(this.base, { body: { ids } })
      .pipe(map((res) => res.data));
  }
}
