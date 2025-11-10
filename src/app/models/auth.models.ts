
/**
 * Interfaces y tipos relacionados con la autenticación
 * Sistema POS para Papelería
 */

/**
 * Datos del usuario autenticado
 * Combina información de Supabase Auth y tabla pos_core.users
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  roleName: string;
  permissions: UserPermissions;
  defaultLocationId?: number;
  locationName?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  emailVerified: boolean;
  avatarUrl?: string;
  metadata?: Record<string, any>;
  // Información adicional de ubicaciones
  assignedLocations?: UserLocation[];
}

/**
 * Estructura de permisos por módulo
 */
export interface UserPermissions {
  sales?: string[]; // ['read', 'write', 'delete']
  inventory?: string[];
  customers?: string[];
  quotes?: string[];
  reports?: string[];
  users?: string[];
  settings?: string[];
  support?: string[];
  [key: string]: string[] | undefined;
}

/**
 * Ubicación asignada a un usuario
 */
export interface UserLocation {
  id: number;
  locationId: number;
  locationName: string;
  locationCode: string;
  isPrimary: boolean;
}

/**
 * Credenciales para login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Respuesta de login exitoso
 */
export interface LoginResponse {
  user: AuthUser;
  session: AuthSession;
  accessToken: string;
  refreshToken: string;
}

/**
 * Información de sesión
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

/**
 * Estado de autenticación
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Datos para registro de usuario
 */
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  defaultLocationId?: number;
}

/**
 * Datos para actualizar perfil
 */
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Datos para cambio de contraseña
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Datos para recuperación de contraseña
 */
export interface ResetPasswordData {
  email: string;
}

/**
 * Token de verificación
 */
export interface VerificationToken {
  token: string;
  expiresAt: Date;
  type: 'email_verification' | 'password_reset';
}

/**
 * Configuración de sesión de usuario
 */
export interface UserSessionConfig {
  locationId?: number;
  ipAddress?: string;
  userAgent?: string;
}
