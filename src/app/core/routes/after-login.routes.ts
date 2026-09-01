import { Routes } from '@angular/router';
import { userRoutes } from './user.routes';
import { settingRoutes } from './setting.routes';
import { accessGuard } from '../guards/access.guard';

export const afterLoginRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layout/layout/layout').then((c) => c.Layout),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../../pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../../pages/profile/profile').then((c) => c.Profile),
      },
      {
        path: 'product',
        canActivate: [accessGuard],
        data: { module: 'products' },
        loadComponent: () =>
          import('../../pages/product-list/product-list').then((c) => c.ProductList),
      },
      {
        path: 'product/add',
        canActivate: [accessGuard],
        data: { module: 'products', action: 'create' },
        loadComponent: () =>
          import('../../pages/product-list/add-edit-product/add-edit-product').then((c) => c.AddEditProduct),
      },
      {
        path: 'product/edit/:id',
        canActivate: [accessGuard],
        data: { module: 'products', action: 'edit' },
        loadComponent: () =>
          import('../../pages/product-list/add-edit-product/add-edit-product').then((c) => c.AddEditProduct),
      },
      {
        path: 'sales',
        canActivate: [accessGuard],
        data: { module: 'sales' },
        loadComponent: () =>
          import('../../pages/sales/sales').then((c) => c.Sales),
      },
      {
        path: 'stock',
        canActivate: [accessGuard],
        data: { module: 'stock' },
        loadComponent: () =>
          import('../../pages/stock/stock').then((c) => c.Stock),
      },
      {
        path: 'report',
        canActivate: [accessGuard],
        data: { module: 'reports' },
        loadComponent: () =>
          import('../../pages/report/report').then((c) => c.Report),
      },
      {
        path: 'location',
        canActivate: [accessGuard],
        data: { module: 'location' },
        loadComponent: () =>
          import('../../pages/location/location').then((c) => c.Location),
      },
      {
        path: 'location/add',
        canActivate: [accessGuard],
        data: { module: 'location', action: 'create' },
        loadComponent: () =>
          import('../../pages/location/add-edit-location/add-edit-location').then((c) => c.AddEditLocation),
      },
      {
        path: 'location/edit/:id',
        canActivate: [accessGuard],
        data: { module: 'location', action: 'edit' },
        loadComponent: () =>
          import('../../pages/location/add-edit-location/add-edit-location').then((c) => c.AddEditLocation),
      },
      {
        path: 'location/view/:id',
        canActivate: [accessGuard],
        data: { module: 'location' },
        loadComponent: () =>
          import('../../pages/location/location-detail/location-detail').then((c) => c.LocationDetail),
      },
      {
        path: 'trace-product',
        loadComponent: () =>
          import('../../pages/trace-product/trace-product').then((c) => c.TraceProduct),
      },
      {
        path: 'user-management',
        canActivate: [accessGuard],
        data: { anyOf: ['customer', 'office', 'staff'] },
        loadComponent: () =>
          import('../../pages/user-management/user-management').then((c) => c.UserManagement),
        children: [...userRoutes]
      },
      {
        path: 'setting',
        canActivate: [accessGuard],
        data: { anyOf: ['access_control', 'role'] },
        loadComponent: () =>
          import('../../pages/setting/setting').then((c) => c.Setting),
        children: [...settingRoutes]

      },
    ],
  },
];
