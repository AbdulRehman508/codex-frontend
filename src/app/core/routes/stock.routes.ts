import { Routes } from '@angular/router';
import { accessGuard } from '../guards/access.guard';

/**
 * Children of the Stock section. Every tab reads the same ledger, so they
 * share the one access key.
 */
export const stockRoutes: Routes = [
  {
    path: 'adjustments',
    canActivate: [accessGuard],
    data: { module: 'stock' },
    loadComponent: () =>
      import('../../pages/stock/adjustments/adjustments').then(
        (c) => c.StockAdjustments,
      ),
  },
  {
    // one branch asking another: the only way stock moves between branches
    path: 'requests',
    canActivate: [accessGuard],
    data: { module: 'stock' },
    loadComponent: () =>
      import('../../pages/stock/requests/requests').then((c) => c.StockRequests),
  },
  {
    path: 'transfers',
    canActivate: [accessGuard],
    data: { module: 'stock' },
    loadComponent: () =>
      import('../../pages/stock/transfers/transfers').then((c) => c.StockTransfers),
  },
];
