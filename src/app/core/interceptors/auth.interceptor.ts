import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';

/**
 * Attaches Bearer token to every outgoing request when a token exists.
 * On 401, clears the token and redirects to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // localStorage only exists in browser; skip on server (SSR).
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }

  const tokenService = inject(TokenService);
  const router = inject(Router);
  const toast = inject(MessageService);
  const token = tokenService.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err?.status === 401) {
        tokenService.clearSession();
        router.navigateByUrl('/login');
      }
      // the server enforces the permission matrix too, so a stale screen can
      // still hit a wall — say so plainly instead of failing silently
      if (err?.status === 403) {
        toast.add({
          severity: 'warn',
          summary: 'Not allowed',
          detail: err?.error?.message ?? 'You do not have permission for this action',
        });
      }
      return throwError(() => err);
    })
  );
};
