import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api.service';
import { ApiSuccess, DayClose, DayCloseQuery } from './day-close.model';

/** Typed client for the day close-out sheet. */
@Injectable({ providedIn: 'root' })
export class DayCloseApiService {
  private api = inject(ApiService);

  getDayClose(params: DayCloseQuery = {}): Observable<DayClose> {
    return this.api
      .getAll<ApiSuccess<DayClose>>('reports/day-close', params)
      .pipe(map((res) => res.data));
  }
}
