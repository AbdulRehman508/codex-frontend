import { Routes } from '@angular/router';


export const userRoutes: Routes = [

    {
        path: 'customer',
        loadComponent: () =>
            import('../../pages/user-management/customer/customer').then((c) => c.Customer),
    },
    {
        path: 'office',
        loadComponent: () =>
            import('../../pages/user-management/office/office').then((c) => c.Office),
    },
    {
        path: 'staff',
        loadComponent: () =>
            import('../../pages/user-management/staff/staff').then((c) => c.Staff),
    },
    {
        path: 'role',
        loadComponent: () =>
            import('../../pages/user-management/role/role').then((c) => c.Role),
    },
    {
        path: 'access',
        loadComponent: () =>
            import('../../pages/user-management/access/access').then((c) => c.Access),
    },
];
