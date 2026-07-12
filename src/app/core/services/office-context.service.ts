import { Injectable, computed, inject, signal } from '@angular/core';

import { TokenService } from './token.service';

const STORAGE_KEY = 'selected_office_id';

/**
 * Holds the office currently selected in the header. Every office-scoped list
 * (staff, roles, ...) reads `selectedOfficeId` so the grid only shows records
 * for that office. Admins may pick any office; others only their assigned ones.
 */
@Injectable({ providedIn: 'root' })
export class OfficeContextService {
  private token = inject(TokenService);

  private readonly _selected = signal<string | null>(this.initial());

  /** Office id selected in the header (null when the user has no offices). */
  readonly selectedOfficeId = this._selected.asReadonly();
  readonly hasOffice = computed(() => !!this._selected());

  private initial(): string | null {
    const saved = localStorage.getItem(STORAGE_KEY);
    const assigned = this.token.getAssignedOfficeIds();
    // keep the saved office only if the user may still see it;
    // otherwise start unselected so the header shows the "Select Office" placeholder
    if (saved && (this.token.isAdmin() || assigned.includes(saved))) {
      return saved;
    }
    return null;
  }

  setOffice(id: string | null) {
    this._selected.set(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
