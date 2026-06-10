import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/**
 * Generic CRUD API service. Pass only the endpoint; base URL is prefixed
 * from the environment automatically.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.nestApiUrl;

  getAll<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(this.url(endpoint));
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

  patch<T>(endpoint: string, id: string | number, body: any): Observable<T> {
    return this.http.patch<T>(`${this.url(endpoint)}/${id}`, body);
  }

  delete<T>(endpoint: string, id: string | number): Observable<T> {
    return this.http.delete<T>(`${this.url(endpoint)}/${id}`);
  }

  private url(endpoint: string): string {
    return `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
  }
}
