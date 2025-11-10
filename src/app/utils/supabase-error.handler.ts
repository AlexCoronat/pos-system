
/**
 * Manejador centralizado de errores de Supabase
 * Sistema POS para Papelería
 */

import { Injectable } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';
import { ERROR_CODES, ERROR_MESSAGES } from './constants';

/**
 * Interfaz para errores personalizados de la aplicación
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  originalError?: any;
  timestamp: Date;
}

/**
 * Servicio para manejo centralizado de errores
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseErrorHandler {

  /**
   * Maneja errores de Supabase y los convierte en errores de aplicación
   */
  handleError(error: any, context?: string): AppError {
    console.error('[SupabaseErrorHandler]', context || 'Error', error);

    // Error de PostgreSQL/Supabase
    if (this.isPostgrestError(error)) {
      return this.handlePostgrestError(error, context);
    }

    // Error de autenticación de Supabase
    if (this.isAuthError(error)) {
      return this.handleAuthError(error, context);
    }

    // Error de red
    if (this.isNetworkError(error)) {
      return this.createAppError(
        ERROR_CODES.NETWORK_ERROR,
        ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        error,
        context
      );
    }

    // Error genérico
    return this.createAppError(
      ERROR_CODES.UNKNOWN_ERROR,
      error?.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
      error,
      context
    );
  }

  /**
   * Verifica si es un error de Postgrest
   */
  private isPostgrestError(error: any): error is PostgrestError {
    return error && typeof error === 'object' && 'code' in error && 'details' in error;
  }

  /**
   * Verifica si es un error de autenticación
   */
  private isAuthError(error: any): boolean {
    return error && (
      error?.message?.includes('auth') ||
      error?.message?.includes('authentication') ||
      error?.message?.includes('credentials') ||
      error?.status === 401 ||
      error?.status === 403
    );
  }

  /**
   * Verifica si es un error de red
   */
  private isNetworkError(error: any): boolean {
    return error && (
      error?.message?.includes('network') ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout') ||
      !navigator.onLine
    );
  }

  /**
   * Maneja errores específicos de Postgrest
   */
  private handlePostgrestError(error: PostgrestError, context?: string): AppError {
    // Mapeo de códigos de error de PostgreSQL a códigos de aplicación
    const errorCodeMap: Record<string, string> = {
      '23505': ERROR_CODES.VALIDATION_ERROR, // unique_violation
      '23503': ERROR_CODES.VALIDATION_ERROR, // foreign_key_violation
      '23502': ERROR_CODES.VALIDATION_ERROR, // not_null_violation
      '23514': ERROR_CODES.VALIDATION_ERROR, // check_violation
      '42P01': ERROR_CODES.DATABASE_ERROR,   // undefined_table
      '42703': ERROR_CODES.DATABASE_ERROR,   // undefined_column
      'PGRST116': ERROR_CODES.DATABASE_ERROR, // No rows found
    };

    const appErrorCode = errorCodeMap[error.code] || ERROR_CODES.DATABASE_ERROR;
    let message = ERROR_MESSAGES[appErrorCode];

    // Personalizar mensajes según el código de error
    if (error.code === '23505') {
      message = 'El registro ya existe';
    } else if (error.code === '23503') {
      message = 'Referencia inválida';
    } else if (error.code === 'PGRST116') {
      message = 'No se encontraron registros';
    }

    return this.createAppError(appErrorCode, message, error, context);
  }

  /**
   * Maneja errores de autenticación
   */
  private handleAuthError(error: any, context?: string): AppError {
    let errorCode:string = ERROR_CODES.AUTH_INVALID_CREDENTIALS;
    let message = ERROR_MESSAGES[errorCode];

    // Mapear errores específicos de autenticación
    if (error?.message?.includes('Invalid login credentials')) {
      errorCode = ERROR_CODES.AUTH_INVALID_CREDENTIALS;
      message = ERROR_MESSAGES[errorCode];
    } else if (error?.message?.includes('User not found')) {
      errorCode = ERROR_CODES.AUTH_USER_NOT_FOUND;
      message = ERROR_MESSAGES[errorCode];
    } else if (error?.message?.includes('JWT expired') || error?.message?.includes('token')) {
      errorCode = ERROR_CODES.AUTH_SESSION_EXPIRED;
      message = ERROR_MESSAGES[errorCode];
    } else if (error?.status === 403) {
      errorCode = ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS;
      message = ERROR_MESSAGES[errorCode];
    }

    return this.createAppError(errorCode, message, error, context);
  }

  /**
   * Crea un objeto de error de aplicación
   */
  private createAppError(
    code: string,
    message: string,
    originalError?: any,
    context?: string
  ): AppError {
    return {
      code,
      message: context ? `${context}: ${message}` : message,
      details: originalError?.details || originalError?.hint,
      originalError,
      timestamp: new Date()
    };
  }

  /**
   * Formatea el error para mostrarlo al usuario
   */
  getUserFriendlyMessage(error: AppError): string {
    return error.message;
  }

  /**
   * Determina si el error es crítico y requiere cerrar sesión
   */
  isCriticalAuthError(error: AppError): boolean {
    return [
      ERROR_CODES.AUTH_SESSION_EXPIRED,
      ERROR_CODES.AUTH_USER_NOT_FOUND
    ].includes(error.code as typeof ERROR_CODES.AUTH_SESSION_EXPIRED | typeof ERROR_CODES.AUTH_USER_NOT_FOUND);
  }

  /**
   * Maneja errores de forma reactiva (para RxJS)
   */
  handleErrorObservable(context?: string) {
    return (error: any) => {
      const appError = this.handleError(error, context);
      throw appError;
    };
  }
}

/**
 * Función helper para manejo rápido de errores
 */
export function handleSupabaseError(error: any, context?: string): never {
  const handler = new SupabaseErrorHandler();
  const appError = handler.handleError(error, context);
  throw appError;
}
