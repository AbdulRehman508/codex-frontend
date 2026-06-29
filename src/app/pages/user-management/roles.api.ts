import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';

export interface Role {
  id: number;
  role: string;
  office_id?: string;
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

/**
 * Roles dropdown source. Roles are office-scoped — pass the office id to get
 * that office's roles. Delegates HTTP to the generic ApiService; auth header
 * added by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private api = inject(ApiService);
  private endpoint = 'roles';

  listRoles(officeIds?: string[]): Observable<Role[]> {
    const params = officeIds?.length ? { office_id: officeIds.join(',') } : undefined;
    return this.api.getAll<ApiSuccess<Role[]>>(this.endpoint, params).pipe(map((res) => res.data));
  }
}
