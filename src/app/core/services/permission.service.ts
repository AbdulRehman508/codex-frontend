import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';
import { TokenService } from './token.service';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

interface ModulePerm {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface AccessPermissionRow extends ModulePerm {
  module: string;
  module_label: string;
}

interface RoleAccessResponse {
  data: { permissions: AccessPermissionRow[] };
}

/**
 * Holds the logged-in user's effective module permissions (from their role's
 * access matrix) and answers `can(module, action)` for menu/route gating.
 * Admins bypass every check. Loaded once per session; reload on login,
 * clear on logout. Fails closed — if the matrix can't be fetched, non-admins
 * are denied module-gated features rather than silently granted them.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private api = inject(ApiService);
  private token = inject(TokenService);

  private _perms = signal<Map<string, ModulePerm>>(new Map());
  private _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  // reactive admin flag so gated views recompute if it ever changes
  readonly isAdmin = computed(() => this.token.isAdmin());

  private inFlight: Promise<void> | null = null;

  /** True when the current user may use `action` on `module`. */
  can(module: string, action: PermAction = 'view'): boolean {
    if (this.token.isAdmin()) return true;
    const p = this._perms().get(module);
    return !!p && p[action];
  }

  /** Load once per session; repeated calls share the same in-flight fetch. */
  ensureLoaded(): Promise<void> {
    if (this._loaded()) return Promise.resolve();
    if (!this.inFlight) this.inFlight = this.fetch();
    return this.inFlight;
  }

  /** Force a fresh load (call right after a new user logs in). */
  reload(): Promise<void> {
    this._loaded.set(false);
    this.inFlight = null;
    return this.ensureLoaded();
  }

  clear() {
    this._perms.set(new Map());
    this._loaded.set(false);
    this.inFlight = null;
  }

  private async fetch(): Promise<void> {
    try {
      // admins see everything — no need to fetch a matrix
      if (this.token.isAdmin()) {
        this._perms.set(new Map());
        return;
      }
      const roleId = this.token.getUser()?.role_id;
      if (roleId == null) {
        this._perms.set(new Map());
        return;
      }
      const res = await firstValueFrom(
        this.api.getById<RoleAccessResponse>('access', roleId),
      );
      const map = new Map<string, ModulePerm>();
      for (const p of res.data.permissions) {
        map.set(p.module, {
          view: p.view,
          create: p.create,
          edit: p.edit,
          delete: p.delete,
        });
      }
      this._perms.set(map);
    } catch {
      // fail closed: deny module-gated features on error
      this._perms.set(new Map());
    } finally {
      this._loaded.set(true);
    }
  }
}
