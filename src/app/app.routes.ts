import { Routes } from '@angular/router';
import { routesAuthentication } from './core/routes/authentication.routes';
import { afterLoginRoutes } from './core/routes/after-login.routes';
import { LoginAuthGuard } from './core/guards/login-auth.guard';

export const routes: Routes = [
    
    {
        path: '',
        canActivate: [LoginAuthGuard],
        children: [] // empty, guard redirect karega
    },

    // After login routes
    {
        path: '',
        children: [...afterLoginRoutes]
    },

    // Auth routes
    {
        path: '',
        children: [...routesAuthentication]
    }



    // ...routesAuthentication, ...afterLoginRoutes
];

