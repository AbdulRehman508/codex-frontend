import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiSuccess,
  CreateRoleDto,
  PaginatedRoles,
  Role,
  RoleListQuery,
  UpdateRoleDto,
} from './role.model';

/**
 * Typed Role API client. Roles are office-scoped. Delegates HTTP to the
 * generic ApiService and unwraps the response envelope, returning `data`.
 * Auth header is added globally by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class RoleApiService {
  private api = inject(ApiService);
  private endpoint = 'roles';

  listRoles(params: RoleListQuery = {}): Observable<PaginatedRoles> {
    return this.api
      .getAll<ApiSuccess<PaginatedRoles>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getRole(id: number): Observable<Role> {
    return this.api.getById<ApiSuccess<Role>>(this.endpoint, id).pipe(map((res) => res.data));
  }

  createRole(body: CreateRoleDto): Observable<Role> {
    return this.api.create<ApiSuccess<Role>>(this.endpoint, body).pipe(map((res) => res.data));
  }

  updateRole(id: number, body: UpdateRoleDto): Observable<Role> {
    return this.api.update<ApiSuccess<Role>>(this.endpoint, id, body).pipe(map((res) => res.data));
  }

  deleteRole(id: number): Observable<{ id: number; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: number; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }

  bulkDeleteRoles(ids: number[]): Observable<{ deleted_count: number }> {
    return this.api
      .deleteBody<ApiSuccess<{ deleted_count: number }>>(this.endpoint, { ids })
      .pipe(map((res) => res.data));
  }
}
