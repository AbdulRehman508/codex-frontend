import { Routes } from '@angular/router';
import { routesAuthentication } from './core/routes/authentication.routes';
import { afterLoginRoutes } from './core/routes/after-login.routes';
import { LoginAuthGuard } from './core/guards/login-auth.guard';

export const routes: Routes = [

    // After login routes
    {
        path: '',
        canActivate: [LoginAuthGuard],
        children: [...afterLoginRoutes]
    },

    // Auth routes
    {
        path: '',
        children: [...routesAuthentication]
    }



    // ...routesAuthentication, ...afterLoginRoutes
];

