import { Routes } from '@angular/router';

export const afterLoginRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../pages/header/header').then((c) => c.Header),
  },
];
