
/**
 * Configuración de entorno - PRODUCCIÓN
 * Sistema POS para Papelería
 *
 * IMPORTANTE:
 * 1. Copiar este archivo a: src/environments/environment.prod.ts
 * 2. Reemplazar los valores con tus credenciales de producción de Supabase
 * 3. NO commitear environment.prod.ts a git (debe estar en .gitignore)
 * 4. Usar variables de entorno del servidor para mayor seguridad
 */

export const environment = {
  /**
   * Indicador de ambiente de producción
   */
  production: true,

  /**
   * Nombre del ambiente
   */
  environmentName: 'production',

  /**
   * Versión de la aplicación
   */
  version: '1.0.0',

  /**
   * Configuración de Supabase
   */
  supabase: {
    /**
     * URL de tu proyecto Supabase de producción
     * Obtener de: https://app.supabase.com/project/YOUR_PROJECT/settings/api
     */
    url: 'TU_SUPABASE_URL_PRODUCCION',

    /**
     * Anon/Public Key de Supabase de producción
     * Obtener de: https://app.supabase.com/project/YOUR_PROJECT/settings/api
     */
    anonKey: 'TU_SUPABASE_ANON_KEY_PRODUCCION',

    /**
     * Service Role Key (SOLO PARA SERVIDOR)
     * NUNCA exponer en el cliente
     */
    serviceRoleKey: '', // NO usar en el cliente
  },

  /**
   * URL base de la API (si tienes un backend adicional)
   */
  apiUrl: 'https://api.tupapeleria.com',

  /**
   * Configuración de Mercado Pago
   */
  mercadoPago: {
    /**
     * Public Key de Mercado Pago para producción
     * Obtener de: https://www.mercadopago.com.mx/developers/panel/credentials
     */
    publicKey: 'TU_MERCADO_PAGO_PUBLIC_KEY_PRODUCCION',

    /**
     * URL de notificaciones webhook
     */
    webhookUrl: 'https://api.tupapeleria.com/webhooks/mercadopago',
  },

  /**
   * Configuración de almacenamiento
   */
  storage: {
    avatarsBucket: 'avatars',
    productImagesBucket: 'product-images',
    documentsBucket: 'documents',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  /**
   * Configuración de la aplicación
   */
  app: {
    name: 'POS Papelería',
    shortName: 'POS',
    defaultLanguage: 'es',
    defaultCurrency: 'MXN',
    defaultTimezone: 'America/Mexico_City',
    defaultTaxRate: 16.0,
  },

  /**
   * Configuración de logs (más restrictiva en producción)
   */
  logging: {
    /**
     * Nivel de logs en producción (solo errores)
     */
    level: 'error',

    /**
     * Deshabilitar logs HTTP en producción
     */
    enableHttpLogs: false,

    /**
     * Deshabilitar logs de auth en producción
     */
    enableAuthLogs: false,
  },

  /**
   * Configuración de funcionalidades
   */
  features: {
    enableOfflineMode: false,
    enablePushNotifications: true,
    enableDarkMode: true,
    enableInvoicing: true,
    enableLoyaltyProgram: true,
    enableMultiplePayments: true,
  },

  /**
   * URLs de la aplicación
   */
  urls: {
    baseUrl: 'https://pos.tupapeleria.com',
    termsUrl: 'https://pos.tupapeleria.com/terms',
    privacyUrl: 'https://pos.tupapeleria.com/privacy',
    supportUrl: 'https://pos.tupapeleria.com/support',
  },
};

/**
 * Tipo del objeto environment
 */
export type Environment = typeof environment;
