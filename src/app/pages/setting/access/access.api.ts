import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import { ApiSuccess, RoleAccess, SavePermission } from './access.model';

/**
 * Typed Access (permissions) API client. Access is keyed by role; because a
 * role belongs to exactly one office, the matrix is inherently office-scoped —
 * the server derives office_id from the role, the client never sends it.
 * Delegates HTTP to the generic ApiService; auth header added globally.
 */
@Injectable({ providedIn: 'root' })
export class AccessApiService {
  private api = inject(ApiService);
  private endpoint = 'access';

  /** READ — permission matrix for a role (catalog merged, defaults false). */
  getAccess(roleId: number): Observable<RoleAccess> {
    return this.api
      .getById<ApiSuccess<RoleAccess>>(this.endpoint, roleId)
      .pipe(map((res) => res.data));
  }

  /** UPDATE — persist the whole matrix for a role. */
  saveAccess(roleId: number, permissions: SavePermission[]): Observable<RoleAccess> {
    return this.api
      .update<ApiSuccess<RoleAccess>>(this.endpoint, roleId, { permissions })
      .pipe(map((res) => res.data));
  }
}
