import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  ApiSuccess,
  ColumnOption,
  CreateRackDto,
  PaginatedRacks,
  Rack,
  RackDetail,
  RackListQuery,
  RackLocationBin,
  RowOption,
  UpdateRackDto,
} from './location.model';

/**
 * Typed Location (rack) API client. Delegates HTTP to the generic ApiService
 * and unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class LocationApiService {
  private api = inject(ApiService);
  private endpoint = 'locations';

  listLocations(params: RackListQuery = {}): Observable<PaginatedRacks> {
    return this.api
      .getAll<ApiSuccess<PaginatedRacks>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  /** Rack plus every generated bin. */
  getLocation(id: string, officeId?: string): Observable<RackDetail> {
    return this.api
      .getAll<ApiSuccess<RackDetail>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  createLocation(body: CreateRackDto): Observable<Rack> {
    return this.api
      .create<ApiSuccess<Rack>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  /** Full update (PUT) — send the whole object. */
  updateLocation(id: string, body: CreateRackDto): Observable<Rack> {
    return this.api
      .update<ApiSuccess<Rack>>(this.endpoint, id, body)
      .pipe(map((res) => res.data));
  }

  /** Partial update (PATCH) — e.g. toggle status. */
  patchLocation(id: string, partial: UpdateRackDto): Observable<Rack> {
    return this.api
      .patch<ApiSuccess<Rack>>(this.endpoint, id, partial)
      .pipe(map((res) => res.data));
  }

  deleteLocation(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }

  bulkDeleteLocations(ids: string[]): Observable<{ deleted_count: number }> {
    return this.api
      .deleteBody<ApiSuccess<{ deleted_count: number }>>(this.endpoint, { ids })
      .pipe(map((res) => res.data));
  }

  // --- dependent dropdowns: rack -> row -> column -> bin ---

  listRows(rackId: string, officeId?: string): Observable<RowOption[]> {
    return this.api
      .getAll<ApiSuccess<RowOption[]>>(`${this.endpoint}/${rackId}/rows`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  listColumns(
    rackId: string,
    row: number,
    officeId?: string,
  ): Observable<ColumnOption[]> {
    return this.api
      .getAll<ApiSuccess<ColumnOption[]>>(
        `${this.endpoint}/${rackId}/rows/${row}/columns`,
        { office_id: officeId },
      )
      .pipe(map((res) => res.data));
  }

  listBins(
    rackId: string,
    row: number,
    column: number,
    officeId?: string,
  ): Observable<RackLocationBin[]> {
    return this.api
      .getAll<ApiSuccess<RackLocationBin[]>>(
        `${this.endpoint}/${rackId}/rows/${row}/columns/${column}/bins`,
        { office_id: officeId },
      )
      .pipe(map((res) => res.data));
  }
}
