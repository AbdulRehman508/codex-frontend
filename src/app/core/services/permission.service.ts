import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

import { TranslationService } from '../i18n/translation.service';
import { ApiService } from './api.service';
import { OfficeContextService } from './office-context.service';
import { TokenService } from './token.service';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

interface ModulePerm {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface PermissionRow extends ModulePerm {
  module: string;
}

interface EffectivePermissions {
  office_id: string | null;
  role_id: number | null;
  role: string | null;
  is_admin: boolean;
  permissions: PermissionRow[];
}

interface PermissionsResponse {
  data: EffectivePermissions;
}

/**
 * What the signed-in user may do **in the branch they are working in**.
 *
 * Permissions are per office, not per person: every branch has its own set of
 * roles, so "manager" in one shop can be allowed things a manager in another
 * is not. Switching the office in the header therefore re-reads the matrix —
 * a user assigned to three branches picks up each branch's own rules with no
 * one re-assigning anything.
 *
 * It asks for its *own* rules (`profile/permissions`) rather than reading the
 * access matrix of a role, which only someone with access-control rights may
 * do. Fails closed: if the call fails, module-gated features stay hidden
 * rather than silently opening.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private api = inject(ApiService);
  private token = inject(TokenService);
  private ctx = inject(OfficeContextService);
  private router = inject(Router);
  private toast = inject(MessageService);
  private i18n = inject(TranslationService);

  private _perms = signal<Map<string, ModulePerm>>(new Map());
  private _loaded = signal(false);
  private _admin = signal(false);
  readonly loaded = this._loaded.asReadonly();

  /** The role the user holds in this branch, for anything that shows it. */
  readonly role = signal<string | null>(null);

  // the token says admin from the moment of login; the server confirms it
  readonly isAdmin = computed(() => this._admin() || this.token.isAdmin());

  /** the office the loaded matrix belongs to */
  private loadedFor: string | null = null;
  private inFlight: Promise<void> | null = null;

  constructor() {
    // the header's office decides which rules apply; untracked so writing the
    // result cannot re-trigger the effect that fetched it
    effect(() => {
      const officeId = this.ctx.selectedOfficeId();
      untracked(() => {
        if (officeId === this.loadedFor && this._loaded()) return;
        const first = this.loadedFor === null;
        this._loaded.set(false);
        this.inFlight = null;
        void this.ensureLoaded().then(() => {
          // the screen they were on may not be theirs in this branch; the
          // route guard only runs on navigation, so check it here too
          if (!first) this.leaveIfNotAllowed();
        });
      });
    });
  }

  /** True when the current user may use `action` on `module`. */
  can(module: string, action: PermAction = 'view'): boolean {
    if (this.isAdmin()) return true;
    const p = this._perms().get(module);
    return !!p && p[action];
  }

  /** Load once per office; repeated calls share the same in-flight fetch. */
  ensureLoaded(): Promise<void> {
    if (this._loaded() && this.loadedFor === this.ctx.selectedOfficeId()) {
      return Promise.resolve();
    }
    if (!this.inFlight) this.inFlight = this.fetch();
    return this.inFlight;
  }

  /** Force a fresh load (call right after a new user logs in). */
  reload(): Promise<void> {
    this._loaded.set(false);
    this.inFlight = null;
    this.loadedFor = null;
    return this.ensureLoaded();
  }

  clear() {
    this._perms.set(new Map());
    this._loaded.set(false);
    this._admin.set(false);
    this.role.set(null);
    this.loadedFor = null;
    this.inFlight = null;
  }

  /**
   * Send the user back to the dashboard if the page they are on is not
   * theirs in the branch they just switched to. The dashboard is the one
   * screen no matrix gates, so it is always somewhere to land.
   */
  private leaveIfNotAllowed() {
    let node: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    const data: Record<string, unknown> = {};
    while (node) {
      Object.assign(data, node.data ?? {});
      node = node.firstChild;
    }

    const module = data['module'] as string | undefined;
    const action = data['action'] as PermAction | undefined;
    const anyOf = data['anyOf'] as string[] | undefined;
    const adminOnly = data['adminOnly'] as boolean | undefined;
    if (!module && !anyOf && !adminOnly) return;

    const allowed =
      (adminOnly ? this.isAdmin() : true) &&
      (module ? this.can(module, action ?? 'view') : true) &&
      (anyOf ? anyOf.some((m) => this.can(m)) : true);
    if (!allowed) this.router.navigateByUrl('/dashboard');
  }

  private async fetch(): Promise<void> {
    const officeId = this.ctx.selectedOfficeId();
    try {
      if (!this.token.isSignedIn()) {
        this._perms.set(new Map());
        return;
      }
      const res = await firstValueFrom(
        this.api.getAll<PermissionsResponse>('profile/permissions', {
          office_id: officeId ?? undefined,
        }),
      );
      const data = res.data;
      this._admin.set(!!data.is_admin);
      this.role.set(data.role);

      const map = new Map<string, ModulePerm>();
      for (const p of data.permissions ?? []) {
        map.set(p.module, {
          view: p.view,
          create: p.create,
          edit: p.edit,
          delete: p.delete,
        });
      }
      this._perms.set(map);
    } catch {
      // Fail closed: deny module-gated features on error. But say so — an
      // empty sidebar with no explanation looks exactly like "this user has
      // no rights", and the usual cause is an API that is down or older than
      // this build, which nobody can guess at from a blank screen.
      this._perms.set(new Map());
      this._admin.set(false);
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.t('perm.loadFailed'),
        detail: this.i18n.t('perm.loadFailedHint'),
        life: 8000,
      });
    } finally {
      this.loadedFor = officeId;
      this._loaded.set(true);
      this.inFlight = null;
    }
  }
}
