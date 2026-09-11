import { Routes } from '@angular/router';
import { accessGuard } from '../guards/access.guard';


export const userRoutes: Routes = [

    // no default redirect: the wrapper lands on the first tab the user may see
    {
        path: 'customer',
        canActivate: [accessGuard],
        data: { module: 'customer' },
        loadComponent: () =>
            import('../../pages/user-management/customer/customer').then((c) => c.Customer),
    },
    {
        path: 'customer/add',
        canActivate: [accessGuard],
        data: { module: 'customer', action: 'create' },
        loadComponent: () =>
            import('../../pages/user-management/customer/add-edit-customer/add-edit-customer').then((c) => c.AddEditCustomer),
    },
    {
        path: 'customer/edit/:id',
        canActivate: [accessGuard],
        data: { module: 'customer', action: 'edit' },
        loadComponent: () =>
            import('../../pages/user-management/customer/add-edit-customer/add-edit-customer').then((c) => c.AddEditCustomer),
    },
    {
        path: 'office/add',
        canActivate: [accessGuard],
        data: { module: 'office', action: 'create', adminOnly: true },
        loadComponent: () =>
            import('../../pages/user-management/office/add-edit-office/add-edit-office').then((c) => c.AddEditOffice),
    },
    {
        path: 'office/edit/:id',
        canActivate: [accessGuard],
        data: { module: 'office', action: 'edit', adminOnly: true },
        loadComponent: () =>
            import('../../pages/user-management/office/add-edit-office/add-edit-office').then((c) => c.AddEditOffice),
    },
    {
        path: 'office/view/:id',
        canActivate: [accessGuard],
        data: { module: 'office', adminOnly: true },
        loadComponent: () =>
            import('../../pages/user-management/office/office-detail/office-detail').then((c) => c.OfficeDetail),
    },
    {
        path: 'office',
        canActivate: [accessGuard],
        data: { module: 'office', adminOnly: true },
        loadComponent: () =>
            import('../../pages/user-management/office/office').then((c) => c.Office),
    },
    {
        path: 'staff',
        canActivate: [accessGuard],
        data: { module: 'staff' },
        loadComponent: () =>
            import('../../pages/user-management/staff/staff').then((c) => c.Staff),
    },
    {
        path: 'staff/add',
        canActivate: [accessGuard],
        data: { module: 'staff', action: 'create' },
        loadComponent: () =>
            import('../../pages/user-management/staff/add-edit-staff/add-edit-staff').then((c) => c.AddEditStaff),
    },
    {
        path: 'staff/edit/:id',
        canActivate: [accessGuard],
        data: { module: 'staff', action: 'edit' },
        loadComponent: () =>
            import('../../pages/user-management/staff/add-edit-staff/add-edit-staff').then((c) => c.AddEditStaff),
    },
    {
        path: 'staff/view/:id',
        canActivate: [accessGuard],
        data: { module: 'staff' },
        loadComponent: () =>
            import('../../pages/user-management/staff/staff-detail/staff-detail').then((c) => c.StaffDetail),
    },
];
