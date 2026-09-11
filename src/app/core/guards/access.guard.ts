import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermAction, PermissionService } from '../services/permission.service';

/**
 * Blocks a route when the user's role lacks access to it. Attach with:
 *   data: { module: 'staff' }                        // needs `view` on the module
 *   data: { module: 'staff', action: 'create' }      // needs `create` (add page)
 *   data: { anyOf: ['customer', 'staff'] }           // needs any one (section gate)
 *   data: { module: 'office', adminOnly: true }      // admins only, no matrix
 * Waits for permissions to load, then redirects denied users to the dashboard
 * (which is never module-gated). Admins always pass the module checks.
 */
export const accessGuard: CanActivateFn = async (route) => {
  const perm = inject(PermissionService);
  const router = inject(Router);

  const module = route.data?.['module'] as string | undefined;
  const action = route.data?.['action'] as PermAction | undefined;
  const anyOf = route.data?.['anyOf'] as string[] | undefined;
  const adminOnly = route.data?.['adminOnly'] as boolean | undefined;
  await perm.ensureLoaded();

  const allowed =
    (adminOnly ? perm.isAdmin() : true) &&
    (module ? perm.can(module, action ?? 'view') : true) &&
    (anyOf ? anyOf.some((m) => perm.can(m)) : true);
  if (allowed) return true;

  router.navigateByUrl('/dashboard');
  return false;
};
