import { Routes } from '@angular/router';


export const userRoutes: Routes = [

    {
        path: '',
        redirectTo: 'customer',
        pathMatch: 'full',
    },
        {
        path: 'customer/add',
        loadComponent: () =>
            import('../../pages/user-management/customer/add-edit-customer/add-edit-customer').then((c) => c.AddEditCustomer),
    },
        {
        path: 'customer/edit/:id',
        loadComponent: () =>
            import('../../pages/user-management/customer/add-edit-customer/add-edit-customer').then((c) => c.AddEditCustomer),
    },
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
