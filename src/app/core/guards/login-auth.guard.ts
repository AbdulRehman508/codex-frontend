import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

/**
 * Keeps the signed-out away from the app. The session itself is an httpOnly
 * cookie the browser cannot read, so "signed in" here means the stored user
 * object is present; if the cookie has since expired, the first API call
 * answers 401 and the interceptor sends them to the login screen.
 */
export const LoginAuthGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.isSignedIn()) return true;

  router.navigate(['/login']);
  return false;
};
