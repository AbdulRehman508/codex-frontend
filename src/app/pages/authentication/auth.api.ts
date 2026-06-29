import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { AuthUser, LoginData, LoginRequest } from './auth.model';

/**
 * Typed Auth API client. Delegates HTTP to the generic ApiService and
 * unwraps the response envelope, returning `data`.
 * Auth header (when a token exists) is added globally by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private api = inject(ApiService);

  login(body: LoginRequest): Observable<LoginData> {
    return this.api.create<{ data: LoginData }>('auth/login', body).pipe(map((res) => res.data));
  }

  /** Current user — re-hydrate session on refresh. */
  me(): Observable<AuthUser> {
    return this.api.getAll<{ data: AuthUser }>('auth/me').pipe(map((res) => res.data));
  }

  logout(): Observable<{ success: boolean }> {
    return this.api.create<{ data: { success: boolean } }>('auth/logout', {}).pipe(map((res) => res.data));
  }

  forgotPassword(email: string): Observable<{ sent: boolean }> {
    return this.api
      .create<{ data: { sent: boolean } }>('auth/forgot-password', { email })
      .pipe(map((res) => res.data));
  }

  resetPassword(token: string, password: string): Observable<{ success: boolean }> {
    return this.api
      .create<{ data: { success: boolean } }>('auth/reset-password', { token, password })
      .pipe(map((res) => res.data));
  }

  changePassword(current_password: string, new_password: string): Observable<{ success: boolean }> {
    return this.api
      .create<{ data: { success: boolean } }>('auth/change-password', { current_password, new_password })
      .pipe(map((res) => res.data));
  }
}
