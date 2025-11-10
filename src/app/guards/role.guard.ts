
/**
 * Guard de Roles y Permisos
 * Protege rutas basado en roles y permisos del usuario
 * Sistema POS para Papelería
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

/**
 * Guard funcional para verificar roles
 *
 * Uso en rutas:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [authGuard, roleGuard],
 *   data: { roles: ['admin', 'manager'] }
 * }
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener roles requeridos de la configuración de ruta
  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    console.warn('[RoleGuard] No se especificaron roles requeridos');
    return true;
  }

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        console.log('[RoleGuard] Usuario no autenticado');
        router.navigate(['/login']);
        return false;
      }

      // Verificar si el usuario tiene alguno de los roles requeridos
      const hasRole = requiredRoles.includes(user.roleName);

      if (!hasRole) {
        console.log(
          '[RoleGuard] Acceso denegado. Rol del usuario:',
          user.roleName,
          'Roles requeridos:',
          requiredRoles
        );
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard funcional para verificar permisos específicos
 *
 * Uso en rutas:
 * {
 *   path: 'sales/create',
 *   component: CreateSaleComponent,
 *   canActivate: [authGuard, permissionGuard],
 *   data: { permissions: ['sales:write'] }
 * }
 */
export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener permisos requeridos de la configuración de ruta
  const requiredPermissions = route.data['permissions'] as string[] | undefined;

  if (!requiredPermissions || requiredPermissions.length === 0) {
    console.warn('[PermissionGuard] No se especificaron permisos requeridos');
    return true;
  }

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        console.log('[PermissionGuard] Usuario no autenticado');
        router.navigate(['/login']);
        return false;
      }

      // Verificar si el usuario tiene todos los permisos requeridos
      const hasAllPermissions = requiredPermissions.every((permission) =>
        authService.hasPermission(permission)
      );

      if (!hasAllPermissions) {
        console.log(
          '[PermissionGuard] Acceso denegado. Permisos requeridos:',
          requiredPermissions
        );
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard para verificar que el usuario tenga al menos uno de los permisos especificados
 *
 * Uso en rutas:
 * {
 *   path: 'inventory',
 *   component: InventoryComponent,
 *   canActivate: [authGuard, anyPermissionGuard],
 *   data: { permissions: ['inventory:read', 'inventory:write'] }
 * }
 */
export const anyPermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredPermissions = route.data['permissions'] as string[] | undefined;

  if (!requiredPermissions || requiredPermissions.length === 0) {
    console.warn('[AnyPermissionGuard] No se especificaron permisos requeridos');
    return true;
  }

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        console.log('[AnyPermissionGuard] Usuario no autenticado');
        router.navigate(['/login']);
        return false;
      }

      // Verificar si el usuario tiene al menos uno de los permisos
      const hasAnyPermission = requiredPermissions.some((permission) =>
        authService.hasPermission(permission)
      );

      if (!hasAnyPermission) {
        console.log(
          '[AnyPermissionGuard] Acceso denegado. Se requiere al menos uno de estos permisos:',
          requiredPermissions
        );
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard combinado de rol Y permiso
 * El usuario debe tener el rol Y el permiso
 *
 * Uso en rutas:
 * {
 *   path: 'settings/users',
 *   component: UsersSettingsComponent,
 *   canActivate: [authGuard, roleAndPermissionGuard],
 *   data: {
 *     roles: ['admin', 'manager'],
 *     permissions: ['users:write']
 *   }
 * }
 */
export const roleAndPermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[] | undefined;
  const requiredPermissions = route.data['permissions'] as string[] | undefined;

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        console.log('[RoleAndPermissionGuard] Usuario no autenticado');
        router.navigate(['/login']);
        return false;
      }

      // Verificar roles
      let hasRole = true;
      if (requiredRoles && requiredRoles.length > 0) {
        hasRole = requiredRoles.includes(user.roleName);
      }

      // Verificar permisos
      let hasPermissions = true;
      if (requiredPermissions && requiredPermissions.length > 0) {
        hasPermissions = requiredPermissions.every((permission) =>
          authService.hasPermission(permission)
        );
      }

      if (!hasRole || !hasPermissions) {
        console.log(
          '[RoleAndPermissionGuard] Acceso denegado.',
          'Rol:', user.roleName,
          'Requeridos:', requiredRoles,
          'Permisos:', hasPermissions
        );
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};

/**
 * Guard para verificar acceso a una ubicación específica
 * Útil para restricciones multi-sucursal
 *
 * Uso en rutas:
 * {
 *   path: 'location/:locationId/reports',
 *   component: LocationReportsComponent,
 *   canActivate: [authGuard, locationAccessGuard]
 * }
 */
export const locationAccessGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const locationId = route.paramMap.get('locationId');

  if (!locationId) {
    console.warn('[LocationAccessGuard] No se especificó locationId en la ruta');
    return true;
  }

  return authService.currentUser$.pipe(
    take(1),
    map((user) => {
      if (!user) {
        console.log('[LocationAccessGuard] Usuario no autenticado');
        router.navigate(['/login']);
        return false;
      }

      // Admin tiene acceso a todas las ubicaciones
      if (user.roleName === 'admin') {
        return true;
      }

      // Verificar si el usuario tiene acceso a esta ubicación
      const hasAccess = user.assignedLocations?.some(
        (loc) => loc.locationId === parseInt(locationId, 10)
      );

      if (!hasAccess) {
        console.log(
          '[LocationAccessGuard] Acceso denegado a ubicación:',
          locationId
        );
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};
