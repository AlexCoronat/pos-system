import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/components/auth-view/auth-view').then(m => m.AuthView)
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/components/auth-view/auth-view').then(m => m.AuthView)
      },
      {
        path: 'password-recovery',
        loadComponent: () => import('./auth/components/password-recovery/password-recovery').then(m => m.PasswordRecovery)
      },
      {
        path: 'change-password',
        loadComponent: () => import('./auth/components/change-password/change-password').then(m => m.ChangePassword)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
