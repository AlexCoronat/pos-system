
/**
 * Servicio de Autenticación con Supabase
 * Maneja login, logout, registro y gestión de sesión
 * Sistema POS para Papelería
 */

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../core/supabase.service';
import { SupabaseErrorHandler } from '../../utils/supabase-error.handler';
import { STORAGE_KEYS, TABLES } from '../../utils/constants';
import {
  AuthUser,
  AuthState,
  LoginCredentials,
  LoginResponse,
  RegisterData,
  UpdateProfileData,
  ChangePasswordData,
  UserSessionConfig,
} from '../../models/auth.models';
import { User } from '../../models/database.types';

/**
 * Servicio de autenticación
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Estado de autenticación como Observable
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  public authState$ = this.authStateSubject.asObservable();

  // Observable del usuario actual
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Observable de loading
  private loadingSubject = new BehaviorSubject<boolean>(true);
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private errorHandler: SupabaseErrorHandler,
    private router: Router
  ) {
    // Inicializar la sesión al cargar el servicio
    this.initializeAuth();
  }

  /**
   * Inicializa la autenticación verificando si hay una sesión activa
   */
  private async initializeAuth(): Promise<void> {
    try {
      this.loadingSubject.next(true);

      // Verificar si hay una sesión activa en Supabase
      const { data: { session } } = await this.supabase.auth.getSession();

      if (session?.user) {
        // Cargar datos completos del usuario
        await this.loadUserData(session.user.id);
      } else {
        this.updateAuthState(false, null);
      }

      // Escuchar cambios en el estado de autenticación
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthService] Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          this.updateAuthState(false, null);
          this.clearLocalData();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await this.loadUserData(session.user.id);
        }
      });

    } catch (error) {
      console.error('[AuthService] Error initializing auth:', error);
      this.updateAuthState(false, null, 'Error al inicializar autenticación');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Carga los datos completos del usuario desde la base de datos
   */
  private async loadUserData(userId: string): Promise<void> {
    try {
      const { data: userData, error } = await this.supabase.client
        .from('pos_core.users')
        .select(`
          *,
          role:roles!role_id(*),
          defaultLocation:locations!default_location_id(*),
          userLocations:user_locations(
            id,
            location_id,
            is_primary,
            location:locations!location_id(*)
          )
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        throw this.errorHandler.handleError(error, 'Carga de datos de usuario');
      }

      if (!userData) {
        throw new Error('Usuario no encontrado');
      }

      // Mapear a AuthUser
      const authUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        roleId: userData.role_id,
        roleName: userData.role?.name || 'unknown',
        permissions: userData.role?.permissions || {},
        defaultLocationId: userData.default_location_id,
        locationName: userData.default_location?.name,
        isActive: userData.is_active,
        lastLoginAt: userData.last_login_at ? new Date(userData.last_login_at) : undefined,
        emailVerified: userData.email_verified,
        avatarUrl: userData.avatar_url,
        metadata: userData.metadata,
        assignedLocations: userData.user_locations?.map((ul: any) => ({
          id: ul.id,
          locationId: ul.location_id,
          locationName: ul.location?.name || '',
          locationCode: ul.location?.code || '',
          isPrimary: ul.is_primary,
        })) || [],
      };

      // Actualizar último login
      await this.updateLastLogin(userId);

      // Guardar en localStorage
      this.saveUserData(authUser);

      // Actualizar estado
      this.updateAuthState(true, authUser);

    } catch (error) {
      console.error('[AuthService] Error loading user data:', error);
      throw error;
    }
  }

  /**
   * Actualiza la fecha de último login
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabase.client
        .from('pos_core.users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.warn('[AuthService] Error updating last login:', error);
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return from(
      this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })
    ).pipe(
      switchMap(async ({ data, error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, 'Login');
        }

        if (!data.session || !data.user) {
          throw new Error('No se pudo iniciar sesión');
        }

        // Cargar datos completos del usuario
        await this.loadUserData(data.user.id);

        const user = this.currentUserSubject.value;
        if (!user) {
          throw new Error('Error al cargar datos del usuario');
        }

        return {
          user,
          session: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at || 0,
            expiresIn: data.session.expires_in || 0,
            tokenType: data.session.token_type,
            user: {
              id: data.user.id,
              email: data.user.email || '',
              emailVerified: !!data.user.email_confirmed_at,
            },
          },
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        } as LoginResponse;
      }),
      catchError((error) => {
        this.updateAuthState(false, null, error.message);
        throw this.errorHandler.handleError(error, 'Login');
      })
    );
  }

  /**
   * Inicia sesión con Google
   */
  loginWithGoogle(): Observable<void> {
    return from(
      this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, 'Login con Google');
        }
      }),
      catchError((error) => {
        throw this.errorHandler.handleError(error, 'Login con Google');
      })
    );
  }


  /**
   * Cierra la sesión del usuario
   */
  logout(): Observable<void> {
    return from(this.supabase.auth.signOut()).pipe(
      tap(() => {
        this.updateAuthState(false, null);
        this.clearLocalData();
        this.router.navigate(['/login']);
      }),
      map(() => void 0),
      catchError((error) => {
        console.error('[AuthService] Error during logout:', error);
        // Forzar logout local incluso si falla el servidor
        this.updateAuthState(false, null);
        this.clearLocalData();
        this.router.navigate(['/login']);
        return of(void 0);
      })
    );
  }

  /**
   * Registra un nuevo usuario
   */
  register(data: RegisterData): Observable<AuthUser> {
    return from(
      this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
          },
        },
      })
    ).pipe(
      switchMap(async ({ data: authData, error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, 'Registro');
        }

        if (!authData.user) {
          throw new Error('Error al crear usuario');
        }

        // Crear registro en tabla pos_core.users
        const { error: userError } = await this.supabase.client
          .from('pos_core.users')
          .insert({
            id: authData.user.id,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            role_id: data.roleId,
            default_location_id: data.defaultLocationId,
            email_verified: false,
            is_active: true,
          });

        if (userError) {
          throw this.errorHandler.handleError(userError, 'Creación de perfil de usuario');
        }

        // Cargar datos del usuario
        await this.loadUserData(authData.user.id);

        const user = this.currentUserSubject.value;
        if (!user) {
          throw new Error('Error al cargar datos del usuario');
        }

        return user;
      }),
      catchError((error) => {
        throw this.errorHandler.handleError(error, 'Registro');
      })
    );
  }

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile(data: UpdateProfileData): Observable<AuthUser> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    return from(
      this.supabase.client
        .from('pos_core.users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          avatar_url: data.avatarUrl,
          metadata: data.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id)
    ).pipe(
      switchMap(async ({ error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, 'Actualización de perfil');
        }

        // Recargar datos del usuario
        await this.loadUserData(currentUser.id);

        const updatedUser = this.currentUserSubject.value;
        if (!updatedUser) {
          throw new Error('Error al recargar datos del usuario');
        }

        return updatedUser;
      }),
      catchError((error) => {
        throw this.errorHandler.handleError(error, 'Actualización de perfil');
      })
    );
  }

  /**
   * Cambia la contraseña del usuario
   */
  changePassword(data: ChangePasswordData): Observable<void> {
    return from(
      this.supabase.auth.updateUser({
        password: data.newPassword,
      })
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, 'Cambio de contraseña');
        }
      }),
      catchError((error) => {
        throw this.errorHandler.handleError(error, 'Cambio de contraseña');
      })
    );
  }

  /**
   * Envía email para recuperación de contraseña
   */
  resetPassword(email: string): Observable<void> {
    return from(
      this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw this.errorHandler.handleError(error, 'Recuperación de contraseña');
        }
      }),
      catchError((error) => {
        throw this.errorHandler.handleError(error, 'Recuperación de contraseña');
      })
    );
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;

    const [module, action] = permission.split(':');
    return user.permissions[module]?.includes(action) || false;
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   */
  hasRole(...roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    return roles.includes(user.roleName);
  }

  /**
   * Obtiene el usuario actual de forma síncrona
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si hay un usuario autenticado
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Actualiza el estado de autenticación
   */
  private updateAuthState(
    isAuthenticated: boolean,
    user: AuthUser | null,
    error: string | null = null
  ): void {
    this.authStateSubject.next({
      isAuthenticated,
      user,
      loading: false,
      error,
    });
    this.currentUserSubject.next(user);
  }

  /**
   * Guarda datos del usuario en localStorage
   */
  private saveUserData(user: AuthUser): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error) {
      console.warn('[AuthService] Error saving user data to localStorage:', error);
    }
  }

  /**
   * Limpia datos locales
   */
  private clearLocalData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_LOCATION);
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      console.warn('[AuthService] Error clearing local data:', error);
    }
  }

  /**
   * Crea una sesión de usuario en la base de datos
   */
  async createUserSession(config?: UserSessionConfig): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('pos_core.user_sessions')
        .insert({
          user_id: user.id,
          location_id: config?.locationId || user.defaultLocationId,
          ip_address: config?.ipAddress,
          user_agent: config?.userAgent || navigator.userAgent,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[AuthService] Error creating session:', error);
        return null;
      }

      localStorage.setItem(STORAGE_KEYS.SESSION_ID, data.id);
      return data.id;
    } catch (error) {
      console.error('[AuthService] Error creating session:', error);
      return null;
    }
  }

  /**
   * Finaliza la sesión actual en la base de datos
   */
  async endUserSession(): Promise<void> {
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) return;

    try {
      await this.supabase.client
        .from('pos_core.user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', sessionId);

      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      console.error('[AuthService] Error ending session:', error);
    }
  }
}
