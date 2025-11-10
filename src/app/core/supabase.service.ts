
/**
 * Servicio base de Supabase
 * Proporciona el cliente configurado de Supabase para toda la aplicación
 * Sistema POS para Papelería
 */

import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';
import { SupabaseErrorHandler } from '../utils/supabase-error.handler';

/**
 * Servicio principal de Supabase
 * Singleton que proporciona acceso al cliente de Supabase
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private errorHandler: SupabaseErrorHandler) {
    // Inicializar el cliente de Supabase con la configuración del entorno
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          // Configuración de autenticación
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          // Duración de la sesión (opcional)
          // storageKey: 'supabase.auth.token',
        },
        // Configuración global de la base de datos
        db: {
          schema: 'public', // Esquema por defecto
        },
        // Configuración de realtime (opcional)
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    );
  }

  /**
   * Obtiene la instancia del cliente de Supabase
   * Usar este método para operaciones CRUD directas
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Obtiene el módulo de autenticación de Supabase
   */
  get auth() {
    return this.supabase.auth;
  }

  /**
   * Obtiene el módulo de almacenamiento de Supabase
   */
  get storage() {
    return this.supabase.storage;
  }

  /**
   * Método helper para consultas con manejo de errores
   * Ejemplo: await query(() => this.supabase.from('products').select())
   */
  async query<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorContext?: string
  ): Promise<T> {
    try {
      const { data, error } = await queryFn();

      if (error) {
        throw this.errorHandler.handleError(error, errorContext);
      }

      if (data === null) {
        throw this.errorHandler.handleError(
          new Error('No se encontraron datos'),
          errorContext
        );
      }

      return data;
    } catch (error) {
      throw this.errorHandler.handleError(error, errorContext);
    }
  }

  /**
   * Método helper para consultas que pueden retornar null sin error
   */
  async queryOptional<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorContext?: string
  ): Promise<T | null> {
    try {
      const { data, error } = await queryFn();

      if (error) {
        throw this.errorHandler.handleError(error, errorContext);
      }

      return data;
    } catch (error) {
      throw this.errorHandler.handleError(error, errorContext);
    }
  }

  /**
   * Ejecuta una función RPC de PostgreSQL
   */
  async rpc<T>(
    functionName: string,
    params?: Record<string, any>,
    errorContext?: string
  ): Promise<T> {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params);

      if (error) {
        throw this.errorHandler.handleError(error, errorContext);
      }

      return data as T;
    } catch (error) {
      throw this.errorHandler.handleError(error, errorContext);
    }
  }

  /**
   * Sube un archivo al storage de Supabase
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: { cacheControl?: string; upsert?: boolean }
  ): Promise<{ path: string; publicUrl: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: options?.cacheControl || '3600',
          upsert: options?.upsert || false,
        });

      if (error) {
        throw this.errorHandler.handleError(error, 'Subida de archivo');
      }

      // Obtener la URL pública del archivo
      const { data: publicUrlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
      };
    } catch (error) {
      throw this.errorHandler.handleError(error, 'Subida de archivo');
    }
  }

  /**
   * Elimina un archivo del storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw this.errorHandler.handleError(error, 'Eliminación de archivo');
      }
    } catch (error) {
      throw this.errorHandler.handleError(error, 'Eliminación de archivo');
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Crea una URL firmada temporal para un archivo privado
   */
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw this.errorHandler.handleError(error, 'Creación de URL firmada');
      }

      return data.signedUrl;
    } catch (error) {
      throw this.errorHandler.handleError(error, 'Creación de URL firmada');
    }
  }

  /**
   * Verifica si el cliente está correctamente inicializado
   */
  isInitialized(): boolean {
    return this.supabase !== null && this.supabase !== undefined;
  }

  /**
   * Obtiene el estado de conexión actual
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('pos_core.users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
