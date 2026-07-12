import { Routes } from '@angular/router';
import { accessGuard } from '../guards/access.guard';


export const settingRoutes: Routes = [

    // no default redirect: the wrapper lands on the first tab the user may see
    {
        path: 'access',
        canActivate: [accessGuard],
        data: { module: 'access_control' },
        loadComponent: () =>
            import('../../pages/setting/access/access').then((c) => c.Access),
    },
    {
        path: 'role/add',
        canActivate: [accessGuard],
        data: { module: 'role', action: 'create' },
        loadComponent: () =>
            import('../../pages/setting/role/add-edit-role/add-edit-role').then((c) => c.AddEditRole),
    },
    {
        path: 'role/edit/:id',
        canActivate: [accessGuard],
        data: { module: 'role', action: 'edit' },
        loadComponent: () =>
            import('../../pages/setting/role/add-edit-role/add-edit-role').then((c) => c.AddEditRole),
    },

    {
        path: 'role',
        canActivate: [accessGuard],
        data: { module: 'role' },
        loadComponent: () =>
            import('../../pages/setting/role/role').then((c) => c.Role),
    },

];
