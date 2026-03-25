import { Routes } from '@angular/router';


export const settingRoutes: Routes = [

    {
        path: '',
        redirectTo: 'access',
        pathMatch: 'full',
    },
    {
        path: 'access',
        loadComponent: () =>
            import('../../pages/setting/access/access').then((c) => c.Access),
    },
    {
        path: 'role',
        loadComponent: () =>
            import('../../pages/setting/role/role').then((c) => c.Role),
    },

];
