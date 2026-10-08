import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import { ApiSuccess, AuditListQuery, PaginatedAudit } from './activity.model';

/** Typed client for the audit trail (admin only, server-side). */
@Injectable({ providedIn: 'root' })
export class ActivityApiService {
  private api = inject(ApiService);
  private endpoint = 'audit-logs';

  listActivity(params: AuditListQuery = {}): Observable<PaginatedAudit> {
    return this.api
      .getAll<ApiSuccess<PaginatedAudit>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }
}
