import { Routes } from '@angular/router';


export const routesAuthentication: Routes = [

  {
    path: 'login',
    loadComponent: () =>
      import('../../pages/authentication/login/login').then((c) => c.Login),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('../../pages/authentication/reset-password/reset-password').then((c) => c.ResetPassword),
  },
];
