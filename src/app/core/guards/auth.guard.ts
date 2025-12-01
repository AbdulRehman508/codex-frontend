import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route, state) => {

    const tokenService = inject(TokenService);

    let token = tokenService.getToken();
    if (token) {
        console.log('user is logged in', token);
        return true;
    } else {
        console.log('auth failed');
        return false;
    }
};


