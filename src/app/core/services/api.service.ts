import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/**
 * Generic CRUD API service. Pass only the endpoint; base URL is prefixed
 * from the environment automatically. Every HTTP call in the app should go
 * through this service — module API clients delegate here, they must not
 * inject HttpClient directly.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.nestApiUrl;

  /** GET list/collection, with optional query params. */
  getAll<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(this.url(endpoint), { params: this.toParams(params) });
  }

  getById<T>(endpoint: string, id: string | number): Observable<T> {
    return this.http.get<T>(`${this.url(endpoint)}/${id}`);
  }

  create<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(this.url(endpoint), body);
  }

  update<T>(endpoint: string, id: string | number, body: any): Observable<T> {
    return this.http.put<T>(`${this.url(endpoint)}/${id}`, body);
  }

  /** PUT to a collection/singleton endpoint (no id in path, e.g. /profile). */
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(this.url(endpoint), body);
  }

  patch<T>(endpoint: string, id: string | number, body: any): Observable<T> {
    return this.http.patch<T>(`${this.url(endpoint)}/${id}`, body);
  }

  delete<T>(endpoint: string, id: string | number): Observable<T> {
    return this.http.delete<T>(`${this.url(endpoint)}/${id}`);
  }

  /** DELETE with a request body (e.g. bulk delete `{ ids }`). */
  deleteBody<T>(endpoint: string, body: any): Observable<T> {
    return this.http.delete<T>(this.url(endpoint), { body });
  }

  private toParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return httpParams;
  }

  private url(endpoint: string): string {
    return `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
  }
}
