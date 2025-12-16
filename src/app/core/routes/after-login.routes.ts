import { Routes } from '@angular/router';

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
        path: 'product',
        loadComponent: () =>
          import('../../pages/product-list/product-list').then((c) => c.ProductList),
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('../../pages/stock/stock').then((c) => c.Stock),
      },
      {
        path: 'report',
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
        loadComponent: () =>
          import('../../pages/user-management/user-management').then((c) => c.UserManagement),
      },
      {
        path: 'setting',
        loadComponent: () =>
          import('../../pages/setting/setting').then((c) => c.Setting),
      },
    ],
  },
];
