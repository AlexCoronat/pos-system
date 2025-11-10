
/**
 * Interfaces TypeScript para las tablas de la base de datos
 * Sistema POS para Papelería
 * Generado basado en el esquema de Supabase
 */

// ============================================
// CORE - Usuarios, Roles, Sucursales
// ============================================

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isActive: boolean;
  timezone: string;
  openingHours?: Record<string, { open: string; close: string }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface User {
  id: string; // UUID
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  defaultLocationId?: number;
  isActive: boolean;
  lastLoginAt?: Date;
  emailVerified: boolean;
  avatarUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relaciones
  role?: Role;
  defaultLocation?: Location;
}

export interface UserLocation {
  id: number;
  userId: string;
  locationId: number;
  isPrimary: boolean;
  assignedAt: Date;
  assignedBy?: string;
  // Relaciones
  location?: Location;
}

export interface UserSession {
  id: string;
  userId: string;
  locationId?: number;
  ipAddress?: string;
  userAgent?: string;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

// ============================================
// INVENTORY - Productos e Inventario
// ============================================

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relaciones
  parent?: Category;
  children?: Category[];
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: number;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  isTaxable: boolean;
  isActive: boolean;
  hasVariants: boolean;
  imageUrl?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relaciones
  category?: Category;
  variants?: ProductVariant[];
  inventory?: Inventory[];
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  barcode?: string;
  variantName: string;
  attributes?: Record<string, string>;
  costPrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: number;
  productId: number;
  locationId: number;
  quantityAvailable: number;
  quantityReserved: number;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  lastRestockDate?: Date;
  lastRestockQuantity?: number;
  isTracked: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Relaciones
  product?: Product;
  location?: Location;
}

export interface InventoryMovement {
  id: number;
  inventoryId: number;
  movementType: 'sale' | 'purchase' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  performedBy?: string;
  createdAt: Date;
}

export interface StockAlert {
  id: number;
  inventoryId: number;
  alertType: 'low_stock' | 'out_of_stock' | 'reorder_point';
  currentQuantity: number;
  thresholdQuantity: number;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  // Relaciones
  inventory?: Inventory;
}

// ============================================
// SALES - Clientes
// ============================================

export interface Customer {
  id: number;
  customerNumber?: string;
  type: 'individual' | 'business';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  birthDate?: Date;
  creditLimit: number;
  currentBalance: number;
  loyaltyPoints: number;
  preferredLocationId?: number;
  isActive: boolean;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relaciones
  preferredLocation?: Location;
  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  addressType: 'shipping' | 'billing' | 'both';
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerCreditHistory {
  id: number;
  customerId: number;
  transactionType: 'charge' | 'payment' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: number;
  notes?: string;
  performedBy?: string;
  createdAt: Date;
}

// ============================================
// SALES - Cotizaciones
// ============================================

export interface Quote {
  id: number;
  quoteNumber: string;
  customerId?: number;
  locationId: number;
  quoteDate: Date;
  expiryDate?: Date;
  status: 'pending' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  convertedToSaleId?: number;
  convertedAt?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relaciones
  customer?: Customer;
  location?: Location;
  items?: QuoteItem[];
  creator?: User;
}

export interface QuoteItem {
  id: number;
  quoteId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relaciones
  product?: Product;
}

export interface QuoteFollowUp {
  id: number;
  quoteId: number;
  followUpDate: Date;
  followUpType?: 'email' | 'phone' | 'whatsapp' | 'in_person';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  assignedTo?: string;
  completedBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SALES - Ventas y Pagos
// ============================================

export interface Sale {
  id: number;
  saleNumber: string;
  customerId?: number;
  locationId: number;
  quoteId?: number;
  saleDate: Date;
  saleType: 'regular' | 'return' | 'exchange';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  currency: string;
  notes?: string;
  invoiceNumber?: string;
  invoiceRequired: boolean;
  soldBy: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relaciones
  customer?: Customer;
  location?: Location;
  quote?: Quote;
  items?: SaleItem[];
  payments?: PaymentTransaction[];
  seller?: User;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  costPrice?: number;
  notes?: string;
  createdAt: Date;
  // Relaciones
  product?: Product;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: 'cash' | 'card' | 'transfer' | 'mercadopago' | 'credit';
  isActive: boolean;
  requiresReference: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: number;
  saleId: number;
  paymentMethodId: number;
  amount: number;
  currency: string;
  transactionDate: Date;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  referenceNumber?: string;
  // Campos Mercado Pago
  mpPaymentId?: string;
  mpStatus?: string;
  mpStatusDetail?: string;
  mpPaymentType?: string;
  mpTransactionAmount?: number;
  mpInstallments?: number;
  mpPayerEmail?: string;
  mpMetadata?: Record<string, any>;
  // Datos de tarjeta
  cardLast4?: string;
  cardBrand?: string;
  notes?: string;
  processedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Relaciones
  paymentMethod?: PaymentMethod;
}

export interface Refund {
  id: number;
  refundNumber: string;
  originalSaleId: number;
  refundSaleId?: number;
  refundDate: Date;
  refundAmount: number;
  refundType?: 'full' | 'partial' | 'exchange';
  reason?: string;
  notes?: string;
  processedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  // Relaciones
  originalSale?: Sale;
}

// ============================================
// DTOs para operaciones comunes
// ============================================

/**
 * DTO para crear una venta completa
 */
export interface CreateSaleDTO {
  customerId?: number;
  locationId: number;
  quoteId?: number;
  saleType?: 'regular' | 'return' | 'exchange';
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountPercent?: number;
  }[];
  payments: {
    paymentMethodId: number;
    amount: number;
    referenceNumber?: string;
  }[];
  discountAmount?: number;
  notes?: string;
  invoiceRequired?: boolean;
}

/**
 * DTO para crear una cotización
 */
export interface CreateQuoteDTO {
  customerId?: number;
  locationId: number;
  expiryDate?: Date;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountPercent?: number;
    notes?: string;
  }[];
  discountAmount?: number;
  notes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
}

/**
 * DTO para convertir cotización a venta
 */
export interface ConvertQuoteToSaleDTO {
  quoteId: number;
  payments: {
    paymentMethodId: number;
    amount: number;
    referenceNumber?: string;
  }[];
  invoiceRequired?: boolean;
  notes?: string;
}

/**
 * DTO para ajuste de inventario
 */
export interface InventoryAdjustmentDTO {
  inventoryId: number;
  quantity: number;
  movementType: 'adjustment' | 'transfer';
  notes?: string;
  targetLocationId?: number; // Para transferencias
}

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Parámetros de consulta paginada
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
