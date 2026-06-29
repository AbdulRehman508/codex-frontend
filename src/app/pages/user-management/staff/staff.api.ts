import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiSuccess,
  CreateStaffDto,
  PaginatedStaff,
  Staff,
  StaffListQuery,
  UpdateStaffDto,
} from './staff.model';

/**
 * Typed Staff API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 * Auth header is added globally by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class StaffApiService {
  private api = inject(ApiService);
  private endpoint = 'staff';

  listStaff(params: StaffListQuery = {}): Observable<PaginatedStaff> {
    return this.api
      .getAll<ApiSuccess<PaginatedStaff>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getStaff(id: string): Observable<Staff> {
    return this.api.getById<ApiSuccess<Staff>>(this.endpoint, id).pipe(map((res) => res.data));
  }

  createStaff(body: CreateStaffDto): Observable<Staff> {
    return this.api.create<ApiSuccess<Staff>>(this.endpoint, body).pipe(map((res) => res.data));
  }

  /** Full update (PUT) — send the whole object. */
  updateStaff(id: string, body: CreateStaffDto): Observable<Staff> {
    return this.api.update<ApiSuccess<Staff>>(this.endpoint, id, body).pipe(map((res) => res.data));
  }

  /** Partial update (PATCH) — e.g. toggle staff_status. */
  patchStaff(id: string, partial: UpdateStaffDto): Observable<Staff> {
    return this.api.patch<ApiSuccess<Staff>>(this.endpoint, id, partial).pipe(map((res) => res.data));
  }

  deleteStaff(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }

  bulkDeleteStaff(ids: string[]): Observable<{ deleted_count: number }> {
    return this.api
      .deleteBody<ApiSuccess<{ deleted_count: number }>>(this.endpoint, { ids })
      .pipe(map((res) => res.data));
  }
}
