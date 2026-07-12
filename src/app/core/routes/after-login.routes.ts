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
        loadComponent: () =>
          import('../../pages/location/location').then((c) => c.Location),
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
