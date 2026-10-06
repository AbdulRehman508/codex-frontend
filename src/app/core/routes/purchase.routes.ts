import { Routes } from '@angular/router';
import { accessGuard } from '../guards/access.guard';

/**
 * Children of the Purchase section. No default redirect: the wrapper lands
 * on the first tab the user may see.
 */
export const purchaseRoutes: Routes = [
  {
    path: 'list',
    canActivate: [accessGuard],
    data: { module: 'purchase' },
    loadComponent: () =>
      import('../../pages/purchase/purchases/purchases').then((c) => c.Purchases),
  },
  {
    path: 'list/add',
    canActivate: [accessGuard],
    data: { module: 'purchase', action: 'create' },
    loadComponent: () =>
      import('../../pages/purchase/purchases/add-edit-purchase/add-edit-purchase').then(
        (c) => c.AddEditPurchase,
      ),
  },
  {
    path: 'list/edit/:id',
    canActivate: [accessGuard],
    data: { module: 'purchase', action: 'edit' },
    loadComponent: () =>
      import('../../pages/purchase/purchases/add-edit-purchase/add-edit-purchase').then(
        (c) => c.AddEditPurchase,
      ),
  },
  {
    path: 'suppliers',
    canActivate: [accessGuard],
    data: { module: 'supplier' },
    loadComponent: () =>
      import('../../pages/purchase/suppliers/suppliers').then((c) => c.Suppliers),
  },
  {
    path: 'suppliers/add',
    canActivate: [accessGuard],
    data: { module: 'supplier', action: 'create' },
    loadComponent: () =>
      import('../../pages/purchase/suppliers/add-edit-supplier/add-edit-supplier').then(
        (c) => c.AddEditSupplier,
      ),
  },
  {
    path: 'suppliers/edit/:id',
    canActivate: [accessGuard],
    data: { module: 'supplier', action: 'edit' },
    loadComponent: () =>
      import('../../pages/purchase/suppliers/add-edit-supplier/add-edit-supplier').then(
        (c) => c.AddEditSupplier,
      ),
  },
];
