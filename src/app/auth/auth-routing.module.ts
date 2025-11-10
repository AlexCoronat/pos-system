
/**
 * Auth Routing Module
 * Defines routes for authentication module
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthView } from './components/auth-view/auth-view';
import { AuthCallback } from './components/auth-callback/auth-callback';
import { PasswordRecovery } from './components/password-recovery/password-recovery';
import { ChangePassword } from './components/change-password/change-password';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: AuthView,
    title: 'Iniciar Sesión',
    data: { mode: 'login' }
  },
  {
    path: 'register',
    component: AuthView,
    title: 'Crear Cuenta',
    data: { mode: 'register' }
  },
  {
    path: 'callback',
    component: AuthCallback,
    title: 'Autenticando...'
  },
  {
    path: 'password-recovery',
    component: PasswordRecovery,
    title: 'Recuperar Contraseña'
  },
  {
    path: 'change-password',
    component: ChangePassword,
    title: 'Cambiar Contraseña'
  },
  {
    path: 'reset-password',
    component: ChangePassword,
    title: 'Restablecer Contraseña'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
