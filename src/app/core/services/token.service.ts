
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


}
