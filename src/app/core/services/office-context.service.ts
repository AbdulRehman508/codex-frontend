import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { TokenService } from './token.service';

const STORAGE_KEY = 'selected_office_id';

/**
 * Holds the office currently selected in the header. Every office-scoped list
 * (staff, roles, locations, products, ...) reads `selectedOfficeId` so the grid
 * only shows records for that office. Admins may pick any office; others only
 * their assigned ones.
 *
 * The choice is remembered server-side on the user record (`last_office_id`),
 * so the same office comes back after a logout/login — even in another browser.
 * localStorage is only a fast local cache of the same value.
 */
@Injectable({ providedIn: 'root' })
export class OfficeContextService {
  private token = inject(TokenService);
  private api = inject(ApiService);

  private readonly _selected = signal<string | null>(this.initial());

  /** Office id selected in the header (null when the user has no offices). */
  readonly selectedOfficeId = this._selected.asReadonly();
  readonly hasOffice = computed(() => !!this._selected());

  private initial(): string | null {
    // server value wins — localStorage may be stale from another account
    const remembered = this.token.getLastOfficeId();
    const cached = localStorage.getItem(STORAGE_KEY);
    return this.allowed(remembered) ? remembered : this.allowed(cached) ? cached : null;
  }

  /**
   * Re-seed from the freshly stored user (call right after login / `me`).
   * Falls back to no selection when the remembered office is gone or the
   * user may no longer see it.
   */
  syncFromUser() {
    const remembered = this.token.getLastOfficeId();
    const next = this.allowed(remembered) ? remembered : null;
    this._selected.set(next);
    this.cache(next);
  }

  /**
   * User picked an office in the header. Only a real id gets here — a null
   * would wipe the remembered office, and the dropdown is not clearable.
   */
  setOffice(id: string) {
    if (!id) return;
    this._selected.set(id);
    this.cache(id);
    this.remember(id);
  }

  /** Drop the local selection on logout — the server value stays put. */
  clear() {
    this._selected.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Admin sees every office; anyone else only their assigned ones. */
  private allowed(id: string | null): id is string {
    if (!id) return false;
    return this.token.isAdmin() || this.token.getAssignedOfficeIds().includes(id);
  }

  private cache(id: string | null) {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** Persist the pick on the user record; best-effort, never blocks the UI. */
  private remember(id: string | null) {
    if (!this.token.getToken()) return;
    this.api.put('profile/last-office', { office_id: id }).subscribe({
      next: () => this.token.setLastOfficeId(id),
      error: () => {
        // keep working offline/on error — the local cache still holds the pick
      },
    });
  }
}
