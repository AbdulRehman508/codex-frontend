import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

export const LoginAuthGuard: CanActivateFn = async () => {

    const tokenService = inject(TokenService);
    const router = inject(Router);
    let token = tokenService.getToken();

    if (token) {
        console.log('user is logged in', token);
        return true;
    }
    else {
        console.log('logged in Failed');
        router.navigate(['/login']);
        return false
    }
};