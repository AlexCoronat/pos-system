
/**
 * Constantes relacionadas con Supabase
 * Sistema POS para Papelería
 */

/**
 * Nombres de esquemas de la base de datos
 */
export const DB_SCHEMAS = {
  CORE: 'pos_core',
  INVENTORY: 'pos_inventory',
  SALES: 'pos_sales',
  SUPPLIERS: 'pos_suppliers',
  SUPPORT: 'pos_support',
  AUDIT: 'pos_audit',
} as const;

/**
 * Nombres de tablas principales
 */
export const TABLES = {
  // Core
  ROLES: 'pos_core.roles',
  LOCATIONS: 'pos_core.locations',
  USERS: 'pos_core.users',
  USER_LOCATIONS: 'pos_core.user_locations',
  USER_SESSIONS: 'pos_core.user_sessions',

  // Inventory
  CATEGORIES: 'pos_inventory.categories',
  PRODUCTS: 'pos_inventory.products',
  PRODUCT_VARIANTS: 'pos_inventory.product_variants',
  INVENTORY: 'pos_inventory.inventory',
  INVENTORY_MOVEMENTS: 'pos_inventory.inventory_movements',
  STOCK_ALERTS: 'pos_inventory.stock_alerts',

  // Sales
  CUSTOMERS: 'pos_sales.customers',
  CUSTOMER_ADDRESSES: 'pos_sales.customer_addresses',
  QUOTES: 'pos_sales.quotes',
  QUOTE_ITEMS: 'pos_sales.quote_items',
  QUOTE_FOLLOW_UPS: 'pos_sales.quote_follow_ups',
  SALES: 'pos_sales.sales',
  SALE_ITEMS: 'pos_sales.sale_items',
  PAYMENT_METHODS: 'pos_sales.payment_methods',
  PAYMENT_TRANSACTIONS: 'pos_sales.payment_transactions',
  REFUNDS: 'pos_sales.refunds',
} as const;

/**
 * Nombres de Edge Functions
 */
export const EDGE_FUNCTIONS = {
  // Ventas
  CREATE_SALE: 'create-sale',
  PROCESS_PAYMENT: 'process-payment',
  PROCESS_REFUND: 'process-refund',

  // Cotizaciones
  CONVERT_QUOTE_TO_SALE: 'convert-quote-to-sale',

  // Inventario
  ADJUST_INVENTORY: 'adjust-inventory',
  TRANSFER_INVENTORY: 'transfer-inventory',

  // Reportes
  GENERATE_SALES_REPORT: 'generate-sales-report',
  GENERATE_INVENTORY_REPORT: 'generate-inventory-report',

  // Mercado Pago
  PROCESS_MP_PAYMENT: 'process-mp-payment',
  HANDLE_MP_WEBHOOK: 'handle-mp-webhook',
} as const;

/**
 * Claves de almacenamiento local
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'supabase.auth.token',
  REFRESH_TOKEN: 'supabase.auth.refresh_token',
  USER_DATA: 'pos.user.data',
  SELECTED_LOCATION: 'pos.selected.location',
  SESSION_ID: 'pos.session.id',
  PREFERENCES: 'pos.user.preferences',
} as const;

/**
 * Roles de usuario predefinidos
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  INVENTORY_MANAGER: 'inventory_manager',
  SALESPERSON: 'salesperson',
  SUPPORT_AGENT: 'support_agent',
  VIEWER: 'viewer',
} as const;

/**
 * Permisos del sistema
 */
export const PERMISSIONS = {
  SALES_READ: 'sales:read',
  SALES_WRITE: 'sales:write',
  SALES_DELETE: 'sales:delete',
  SALES_REFUND: 'sales:refund',

  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_ADJUST: 'inventory:adjust',

  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write',
  CUSTOMERS_DELETE: 'customers:delete',

  QUOTES_READ: 'quotes:read',
  QUOTES_WRITE: 'quotes:write',
  QUOTES_DELETE: 'quotes:delete',
  QUOTES_APPROVE: 'quotes:approve',

  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',

  SUPPORT_READ: 'support:read',
  SUPPORT_WRITE: 'support:write',
} as const;

/**
 * Estados de ventas
 */
export const SALE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

/**
 * Estados de cotizaciones
 */
export const QUOTE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
} as const;

/**
 * Estados de pagos
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

/**
 * Tipos de movimiento de inventario
 */
export const MOVEMENT_TYPES = {
  SALE: 'sale',
  PURCHASE: 'purchase',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  RETURN: 'return',
} as const;

/**
 * Configuración de paginación por defecto
 */
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  PAGE: 1,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Configuración de timeouts
 */
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 segundos
  EDGE_FUNCTION: 60000, // 60 segundos
  FILE_UPLOAD: 120000, // 2 minutos
} as const;

/**
 * Códigos de error personalizados
 */
export const ERROR_CODES = {
  // Autenticación
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_SESSION_EXPIRED: 'auth/session-expired',
  AUTH_INSUFFICIENT_PERMISSIONS: 'auth/insufficient-permissions',

  // Inventario
  INVENTORY_INSUFFICIENT_STOCK: 'inventory/insufficient-stock',
  INVENTORY_PRODUCT_NOT_FOUND: 'inventory/product-not-found',

  // Ventas
  SALES_INVALID_PAYMENT: 'sales/invalid-payment',
  SALES_ALREADY_REFUNDED: 'sales/already-refunded',

  // Cotizaciones
  QUOTE_ALREADY_CONVERTED: 'quote/already-converted',
  QUOTE_EXPIRED: 'quote/expired',

  // General
  VALIDATION_ERROR: 'validation/error',
  DATABASE_ERROR: 'database/error',
  NETWORK_ERROR: 'network/error',
  UNKNOWN_ERROR: 'unknown/error',
} as const;

/**
 * Mensajes de error en español
 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Credenciales inválidas',
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: 'Usuario no encontrado',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Sesión expirada. Por favor, inicia sesión nuevamente',
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'No tienes permisos suficientes para realizar esta acción',

  [ERROR_CODES.INVENTORY_INSUFFICIENT_STOCK]: 'Stock insuficiente',
  [ERROR_CODES.INVENTORY_PRODUCT_NOT_FOUND]: 'Producto no encontrado',

  [ERROR_CODES.SALES_INVALID_PAYMENT]: 'Pago inválido',
  [ERROR_CODES.SALES_ALREADY_REFUNDED]: 'Esta venta ya fue reembolsada',

  [ERROR_CODES.QUOTE_ALREADY_CONVERTED]: 'Esta cotización ya fue convertida a venta',
  [ERROR_CODES.QUOTE_EXPIRED]: 'Esta cotización ha expirado',

  [ERROR_CODES.VALIDATION_ERROR]: 'Error de validación',
  [ERROR_CODES.DATABASE_ERROR]: 'Error de base de datos',
  [ERROR_CODES.NETWORK_ERROR]: 'Error de conexión',
  [ERROR_CODES.UNKNOWN_ERROR]: 'Error desconocido',
};

/**
 * Configuración de RxJS
 */
export const RXJS_CONFIG = {
  DEBOUNCE_TIME: 300, // ms para búsquedas
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
} as const;
