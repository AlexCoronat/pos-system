
/**
 * Auth Routing Module
 * Defines routes for authentication module
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from '../auth/components/login/login';
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
    component: Login,
    title: 'Iniciar Sesión'
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
