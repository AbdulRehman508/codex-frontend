import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import { ApiSuccess, ProfitQuery, ProfitReport } from './profit.model';

/** Typed client for the profit view. */
@Injectable({ providedIn: 'root' })
export class ProfitApiService {
  private api = inject(ApiService);

  getProfit(params: ProfitQuery = {}): Observable<ProfitReport> {
    return this.api
      .getAll<ApiSuccess<ProfitReport>>('reports/profit', params)
      .pipe(map((res) => res.data));
  }
}
