
/**
 * Guard de Autenticación
 * Protege rutas que requieren autenticación
 * Sistema POS para Papelería
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

/**
 * Guard funcional para proteger rutas autenticadas
 * Uso en rutas:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    take(1),
    map((authState) => {
      // Si está cargando, esperar
      if (authState.loading) {
        return false;
      }

      // Si está autenticado, permitir acceso
      if (authState.isAuthenticated && authState.user) {
        return true;
      }

      // Si no está autenticado, redirigir al login
      console.log('[AuthGuard] Usuario no autenticado, redirigiendo a login');

      // Guardar la URL intentada para redirigir después del login
      const returnUrl = state.url;
      router.navigate(['/login'], {
        queryParams: { returnUrl }
      });

      return false;
    })
  );
};

/**
 * Guard inverso - Redirige a dashboard si ya está autenticado
 * Útil para páginas de login/register
 *
 * Uso en rutas:
 * {
 *   path: 'login',
 *   component: LoginComponent,
 *   canActivate: [guestGuard]
 * }
 */
export const guestGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    take(1),
    map((authState) => {
      // Si está autenticado, redirigir al dashboard
      if (authState.isAuthenticated && authState.user) {
        console.log('[GuestGuard] Usuario ya autenticado, redirigiendo a dashboard');
        router.navigate(['/dashboard']);
        return false;
      }

      // Si no está autenticado, permitir acceso
      return true;
    })
  );
};

/**
 * Guard para verificar si el email está verificado
 *
 * Uso en rutas:
 * {
 *   path: 'settings',
 *   component: SettingsComponent,
 *   canActivate: [authGuard, emailVerifiedGuard]
 * }
 */
export const emailVerifiedGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      if (!user.emailVerified) {
        console.log('[EmailVerifiedGuard] Email no verificado');
        router.navigate(['/verify-email']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard para verificar que el usuario esté activo
 *
 * Uso en rutas:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [authGuard, activeUserGuard]
 * }
 */
export const activeUserGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      if (!user.isActive) {
        console.log('[ActiveUserGuard] Usuario inactivo');
        // Cerrar sesión
        authService.logout().subscribe();
        return false;
      }

      return true;
    })
  );
};
