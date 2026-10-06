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
    },

    // anything else: a real 404 instead of a blank screen
    {
        path: '**',
        loadComponent: () =>
            import('./pages/not-found/not-found').then((c) => c.NotFound)
    }
];

