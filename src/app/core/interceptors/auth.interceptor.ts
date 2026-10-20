import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';

/**
 * Sends the session cookie with every call and handles the two answers the
 * whole app shares: 401 means the session is gone, 403 means the role does
 * not allow it. The token itself is an httpOnly cookie, so nothing here ever
 * touches it.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // localStorage only exists in browser; skip on server (SSR).
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }

  const tokenService = inject(TokenService);
  const router = inject(Router);
  const toast = inject(MessageService);

  // withCredentials is what makes the browser attach the session cookie
  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err) => {
      if (err?.status === 401) {
        tokenService.clearSession();
        router.navigateByUrl('/login');
        // the API says "token missing", which means nothing to a shopkeeper.
        // Rewriting it here fixes every screen at once, because each one
        // toasts whatever `error.message` holds.
        if (err?.error) {
          err.error.message = 'Your session has ended. Please sign in again.';
        }
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
