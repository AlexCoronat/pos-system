
/**
 * Configuración de entorno - DESARROLLO
 * Sistema POS para Papelería
 *
 * IMPORTANTE:
 * 1. Copiar este archivo a: src/environments/environment.ts
 * 2. Reemplazar los valores con tus credenciales de Supabase
 * 3. NO commitear environment.ts a git (debe estar en .gitignore)
 */

export const environment = {
  /**
   * Indicador de ambiente de producción
   */
  production: false,

  /**
   * Nombre del ambiente
   */
  environmentName: 'development',

  /**
   * Versión de la aplicación
   */
  version: '1.0.0',

  /**
   * Configuración de Supabase
   */
  supabase: {
    /**
     * URL de tu proyecto Supabase
     * Obtener de: https://app.supabase.com/project/YOUR_PROJECT/settings/api
     * Ejemplo: 'https://xyzcompany.supabase.co'
     */
    url: 'https://yttilwxsaidotjgyxhih.supabase.co',

    /**
     * Anon/Public Key de Supabase
     * Obtener de: https://app.supabase.com/project/YOUR_PROJECT/settings/api
     * Esta key es segura para exponerla en el cliente
     */
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dGlsd3hzYWlkb3RqZ3l4aGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MzgwODQsImV4cCI6MjA3ODIxNDA4NH0.hAN7gakg1194IZkvtOn4dSGqysv7trc2TsVlxxzAz-0',

    /**
     * Service Role Key (SOLO PARA SERVIDOR)
     * NO usar en el cliente, solo en Edge Functions o backend
     * Esta key tiene privilegios completos
     */
    serviceRoleKey: 'TU_SUPABASE_SERVICE_ROLE_KEY', // NO usar en el cliente
  },

  /**
   * URL base de la API (si tienes un backend adicional)
   * Dejar vacío si solo usas Supabase directamente
   */
  apiUrl: '',

  /**
   * Configuración de Mercado Pago
   */
  mercadoPago: {
    /**
     * Public Key de Mercado Pago para desarrollo
     * Obtener de: https://www.mercadopago.com.mx/developers/panel/credentials
     */
    publicKey: 'TU_MERCADO_PAGO_PUBLIC_KEY',

    /**
     * URL de notificaciones webhook (si aplica)
     */
    webhookUrl: '',
  },

  /**
   * Configuración de almacenamiento
   */
  storage: {
    /**
     * Bucket para avatares de usuarios
     */
    avatarsBucket: 'avatars',

    /**
     * Bucket para imágenes de productos
     */
    productImagesBucket: 'product-images',

    /**
     * Bucket para documentos (facturas, reportes, etc.)
     */
    documentsBucket: 'documents',

    /**
     * Tamaño máximo de archivo en bytes (5MB)
     */
    maxFileSize: 5 * 1024 * 1024,

    /**
     * Tipos de archivo permitidos para imágenes
     */
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

    /**
     * Tipos de archivo permitidos para documentos
     */
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  /**
   * Configuración de la aplicación
   */
  app: {
    /**
     * Nombre de la aplicación
     */
    name: 'POS Papelería',

    /**
     * Nombre corto para PWA
     */
    shortName: 'POS',

    /**
     * Idioma por defecto
     */
    defaultLanguage: 'es',

    /**
     * Moneda por defecto
     */
    defaultCurrency: 'MXN',

    /**
     * Timezone por defecto
     */
    defaultTimezone: 'America/Mexico_City',

    /**
     * IVA por defecto (16%)
     */
    defaultTaxRate: 16.0,
  },

  /**
   * Configuración de logs
   */
  logging: {
    /**
     * Nivel de logs en consola
     * 'debug' | 'info' | 'warn' | 'error' | 'none'
     */
    level: 'debug',

    /**
     * Habilitar logs de HTTP
     */
    enableHttpLogs: true,

    /**
     * Habilitar logs de estado de auth
     */
    enableAuthLogs: true,
  },

  /**
   * Configuración de funcionalidades
   */
  features: {
    /**
     * Habilitar modo offline
     */
    enableOfflineMode: false,

    /**
     * Habilitar notificaciones push
     */
    enablePushNotifications: false,

    /**
     * Habilitar modo oscuro
     */
    enableDarkMode: true,

    /**
     * Habilitar facturación electrónica
     */
    enableInvoicing: false,

    /**
     * Habilitar programa de lealtad
     */
    enableLoyaltyProgram: true,

    /**
     * Habilitar múltiples métodos de pago por venta
     */
    enableMultiplePayments: true,
  },

  /**
   * URLs de la aplicación
   */
  urls: {
    /**
     * URL base de la aplicación
     */
    baseUrl: 'http://localhost:4200',

    /**
     * URL de términos y condiciones
     */
    termsUrl: '/terms',

    /**
     * URL de política de privacidad
     */
    privacyUrl: '/privacy',

    /**
     * URL de soporte
     */
    supportUrl: '/support',
  },
};

/**
 * Tipo del objeto environment para autocompletado
 */
export type Environment = typeof environment;
