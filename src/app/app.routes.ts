import { Routes } from '@angular/router';
import { routesAuthentication } from './core/routes/authentication.routes';
import { afterLoginRoutes } from './core/routes/after-login.routes';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

    {
        path: '',
        canActivate: [authGuard],
        children: [
            ...afterLoginRoutes
        ]
    },
    {
        path: '',
        canActivate: [authGuard],
        children: [
            ...routesAuthentication
        ]
    }

    // ...routesAuthentication, ...afterLoginRoutes
];

