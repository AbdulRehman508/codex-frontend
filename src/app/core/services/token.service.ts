
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})

export class TokenService {

    constructor(
        private router: Router,
    ) { }

    /**
     * Saves the token to local storage
     * @param token the token to save
     */
    setToken(token: string) {
        localStorage.setItem('token', token);
    }

    /**
     * Retrieves the token from local storage
     * @returns the token if it exists
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Removes the token from local storage
     */
    removeToken() {
        localStorage.clear();
    }


}
