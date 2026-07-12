
import { Injectable } from '@angular/core';

import { AuthUser } from '../../pages/authentication/auth.model';


@Injectable({
  providedIn: 'root'
})

export class TokenService {

    constructor(
    ) { }

    setToken(token: string) {
        localStorage.setItem('token', token);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    removeToken() {
        localStorage.removeItem('token');
    }

    setUser(user: AuthUser) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    getUser(): AuthUser | null {
        const raw = localStorage.getItem('user');
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    }

    removeUser() {
        localStorage.removeItem('user');
    }

    /** Clear the whole session (token + user). */
    clearSession() {
        this.removeToken();
        this.removeUser();
    }

    /** True when the logged-in user's role is Admin (sees every office). */
    isAdmin(): boolean {
        return this.getUser()?.role?.trim().toLowerCase() === 'admin';
    }

    /** Office ids assigned to the logged-in user. */
    getAssignedOfficeIds(): string[] {
        return this.getUser()?.office_ids ?? [];
    }

    /**
     * Restrict an office list to what the current user may see:
     * Admin → all offices; anyone else → only their assigned offices.
     */
    filterOfficesForUser<T extends { id: string }>(offices: T[]): T[] {
        if (this.isAdmin()) return offices;
        const assigned = new Set(this.getAssignedOfficeIds());
        return offices.filter((o) => assigned.has(o.id));
    }

}
