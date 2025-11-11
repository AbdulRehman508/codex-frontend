import { Routes } from '@angular/router';


export const routesAuthentication: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../page/authentication/login/login').then((c) => c.Login),
  },
];
