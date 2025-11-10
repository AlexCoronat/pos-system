/**
 * Interceptor HTTP de Autenticación
 * Agrega el token de autenticación a todas las peticiones HTTP
 * Sistema POS para Papelería
 */

import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, from, Observable } from 'rxjs';
import { SupabaseService } from '../core/supabase.service';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '@env/environment';

/**
 * Interceptor funcional de autenticación (Angular 20+)
 *
 * Configuración en app.config.ts:
 *
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { authInterceptor } from './interceptors/auth.interceptor';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([authInterceptor])),
 *     // ... otros providers
 *   ]
 * };
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = inject(SupabaseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Solo interceptar peticiones a Supabase o tu API
  const isSupabaseRequest = req.url.includes(environment.supabase.url);
  const isApiRequest = environment.apiUrl && req.url.includes(environment.apiUrl);

  if (!isSupabaseRequest && !isApiRequest) {
    return next(req);
  }

  // Obtener el token de acceso actual
  return from(getAccessToken(supabase)).pipe(
    switchMap((token) => {
      // Clonar la petición y agregar el token
      let clonedReq = req;

      if (token) {
        clonedReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Continuar con la petición
      return next(clonedReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // Manejar errores de autenticación
          if (error.status === 401) {
            console.error('[AuthInterceptor] Token expirado o inválido');

            // Intentar refrescar el token
            return refreshTokenAndRetry(supabase, authService, router, req, next);
          }

          if (error.status === 403) {
            console.error('[AuthInterceptor] Permisos insuficientes');
            router.navigate(['/unauthorized']);
          }

          return throwError(() => error);
        })
      );
    })
  );
};

/**
 * Obtiene el token de acceso actual
 */
function getAccessToken(supabase: SupabaseService) {
  // Convertir la Promise de Supabase a un Observable usando `from`
  return from(
    supabase.auth.getSession().then(({ data: { session } }) => session?.access_token || null)
  );
}

/**
 * Intenta refrescar el token y reintentar la petición
 */
function refreshTokenAndRetry(
  supabase: SupabaseService,
  authService: AuthService,
  router: Router,
  req: any,
  next: any
): Observable<HttpEvent<unknown>> {
  return from(
    supabase.auth.refreshSession().then(({ data, error }) => {
      if (error || !data.session) {
        console.error('[AuthInterceptor] No se pudo refrescar el token');
        authService.logout().subscribe();
        router.navigate(['/login']);
        return null;
      }
      return data.session.access_token;
    })
  ).pipe(
    switchMap((newToken): Observable<HttpEvent<unknown>> => {
      if (!newToken) {
        return throwError(() => new Error('No se pudo refrescar el token'));
      }

      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      });

      return next(clonedReq);
    })
  );
}

/**
 * Interceptor para logging de peticiones HTTP (opcional)
 * Útil para debugging en desarrollo
 *
 * Configuración:
 * provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = Date.now();

  console.log('[HTTP Request]', req.method, req.url);

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          const elapsed = Date.now() - startTime;
          console.log(
            '[HTTP Response]',
            req.method,
            req.url,
            event.status,
            `${elapsed}ms`
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        const elapsed = Date.now() - startTime;
        console.error(
          '[HTTP Error]',
          req.method,
          req.url,
          error.status,
          error.message,
          `${elapsed}ms`
        );
      },
    })
  );
};

/**
 * Interceptor para retry automático en caso de error de red
 *
 * Configuración:
 * provideHttpClient(withInterceptors([authInterceptor, retryInterceptor]))
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 segundo

  return next(req).pipe(
    retry({
      count: maxRetries,
      delay: (error: HttpErrorResponse, retryCount) => {
        // Solo reintentar en errores de red o 5xx
        if (error.status >= 500 || error.status === 0) {
          console.log(`[RetryInterceptor] Reintentando (${retryCount}/${maxRetries})...`);
          return timer(retryDelay * retryCount);
        }
        // No reintentar otros errores
        return throwError(() => error);
      },
    }),
    catchError((error) => {
      console.error('[RetryInterceptor] Máximo de reintentos alcanzado');
      return throwError(() => error);
    })
  );
};

/**
 * Interceptor para agregar headers personalizados
 * Útil para tracking, analytics, etc.
 *
 * Configuración:
 * provideHttpClient(withInterceptors([authInterceptor, customHeadersInterceptor]))
 */
export const customHeadersInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const currentUser = authService.getCurrentUser();

  // Agregar headers personalizados
  let clonedReq = req.clone({
    setHeaders: {
      'X-App-Version': environment.version || '1.0.0',
      'X-User-Agent': navigator.userAgent,
      ...(currentUser?.defaultLocationId && {
        'X-Location-Id': currentUser.defaultLocationId.toString(),
      }),
    },
  });

  return next(clonedReq);
};

// Necesario para el loggingInterceptor
import { tap } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';
import { retry, timer } from 'rxjs';
