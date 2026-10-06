import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  ApiSuccess,
  PayableRow,
  PayableSummary,
  ProductReportRow,
  ProductReportSummary,
  ReceivableRow,
  ReceivableSummary,
  ReportKey,
  ReportPage,
  ReportQuery,
  ReportRow,
  SalesReportRow,
  SalesReportSummary,
  StockReportRow,
  StockReportSummary,
} from './report.model';

/**
 * Typed Reports API client. The four reports share one envelope, so the page
 * can fetch any of them through `getReport(key, params)`.
 */
@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private api = inject(ApiService);
  private endpoint = 'reports';

  getSales(
    params: ReportQuery = {},
  ): Observable<ReportPage<SalesReportRow, SalesReportSummary>> {
    return this.fetch<SalesReportRow, SalesReportSummary>('sales', params);
  }

  getProducts(
    params: ReportQuery = {},
  ): Observable<ReportPage<ProductReportRow, ProductReportSummary>> {
    return this.fetch<ProductReportRow, ProductReportSummary>('products', params);
  }

  getStock(
    params: ReportQuery = {},
  ): Observable<ReportPage<StockReportRow, StockReportSummary>> {
    return this.fetch<StockReportRow, StockReportSummary>('stock', params);
  }

  getReceivables(
    params: ReportQuery = {},
  ): Observable<ReportPage<ReceivableRow, ReceivableSummary>> {
    return this.fetch<ReceivableRow, ReceivableSummary>('receivables', params);
  }

  getPayables(
    params: ReportQuery = {},
  ): Observable<ReportPage<PayableRow, PayableSummary>> {
    return this.fetch<PayableRow, PayableSummary>('payables', params);
  }

  /** Whichever report the page is showing. */
  getReport(
    key: ReportKey,
    params: ReportQuery = {},
  ): Observable<ReportPage<ReportRow, Record<string, number>>> {
    return this.fetch<ReportRow, Record<string, number>>(key, params);
  }

  private fetch<TRow, TSummary>(
    key: ReportKey,
    params: ReportQuery,
  ): Observable<ReportPage<TRow, TSummary>> {
    return this.api
      .getAll<ApiSuccess<ReportPage<TRow, TSummary>>>(
        `${this.endpoint}/${key}`,
        params as Record<string, unknown>,
      )
      .pipe(map((res) => res.data));
  }
}
