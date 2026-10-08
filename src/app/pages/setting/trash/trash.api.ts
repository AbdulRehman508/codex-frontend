import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import {
  ApiSuccess,
  PaginatedTrash,
  TrashListQuery,
  TrashModule,
} from './trash.model';

/** Typed client for the recycle bin (admin only, server-side). */
@Injectable({ providedIn: 'root' })
export class TrashApiService {
  private api = inject(ApiService);
  private endpoint = 'trash';

  listTrash(params: TrashListQuery = {}): Observable<PaginatedTrash> {
    return this.api
      .getAll<ApiSuccess<PaginatedTrash>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  restore(module: TrashModule, id: string): Observable<{ label: string }> {
    return this.api
      .create<ApiSuccess<{ label: string }>>(
        `${this.endpoint}/${module}/${id}/restore`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  /** Permanent — there is nothing after this. */
  purge(module: TrashModule, id: string): Observable<{ purged: boolean }> {
    return this.api
      .delete<ApiSuccess<{ purged: boolean }>>(`${this.endpoint}/${module}`, id)
      .pipe(map((res) => res.data));
  }
}
