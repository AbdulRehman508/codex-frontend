import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { ApiSuccess, DashboardOverview, DashboardQuery } from './dashboard.model';

/** Typed Dashboard API client — one call returns every widget's data. */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private api = inject(ApiService);

  getOverview(params: DashboardQuery): Observable<DashboardOverview> {
    return this.api
      .getAll<ApiSuccess<DashboardOverview>>('dashboard', params)
      .pipe(map((res) => res.data));
  }
}
