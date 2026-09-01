import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import {
  ApiSuccess,
  CreateProductDto,
  PaginatedProducts,
  Product,
  ProductListQuery,
  UpdateProductDto,
} from './product.model';

/**
 * Typed Product API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 */
@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private api = inject(ApiService);
  private endpoint = 'products';

  listProducts(params: ProductListQuery = {}): Observable<PaginatedProducts> {
    return this.api
      .getAll<ApiSuccess<PaginatedProducts>>(this.endpoint, params)
      .pipe(map((res) => res.data));
  }

  getProduct(id: string, officeId?: string): Observable<Product> {
    return this.api
      .getAll<ApiSuccess<Product>>(`${this.endpoint}/${id}`, {
        office_id: officeId,
      })
      .pipe(map((res) => res.data));
  }

  createProduct(body: CreateProductDto): Observable<Product> {
    return this.api
      .create<ApiSuccess<Product>>(this.endpoint, body)
      .pipe(map((res) => res.data));
  }

  /** Full update (PUT) — send the whole object. */
  updateProduct(id: string, body: CreateProductDto): Observable<Product> {
    return this.api
      .update<ApiSuccess<Product>>(this.endpoint, id, body)
      .pipe(map((res) => res.data));
  }

  /** Partial update (PATCH) — e.g. toggle status or move to another bin. */
  patchProduct(id: string, partial: UpdateProductDto): Observable<Product> {
    return this.api
      .patch<ApiSuccess<Product>>(this.endpoint, id, partial)
      .pipe(map((res) => res.data));
  }

  deleteProduct(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.api
      .delete<ApiSuccess<{ id: string; deleted: boolean }>>(this.endpoint, id)
      .pipe(map((res) => res.data));
  }

  bulkDeleteProducts(ids: string[]): Observable<{ deleted_count: number }> {
    return this.api
      .deleteBody<ApiSuccess<{ deleted_count: number }>>(this.endpoint, { ids })
      .pipe(map((res) => res.data));
  }
}
