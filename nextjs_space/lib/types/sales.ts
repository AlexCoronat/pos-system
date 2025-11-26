/**
 * Types for Sales Module
 */

// ============================================
// SALES TYPES
// ============================================

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mercadopago' | 'credit'

export interface Sale {
  id: number
  saleNumber: string
  locationId: number
  locationName?: string
  customerId?: number
  customerName?: string
  soldById: string
  soldByName?: string
  status: SaleStatus
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  notes?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface SaleItem {
  id: number
  saleId: number
  productId: number
  productName?: string
  productSku?: string
  variantId?: number
  variantName?: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  total: number
  notes?: string
}

export interface SaleWithItems extends Sale {
  items: SaleItem[]
  payments: PaymentTransaction[]
}

export interface PaymentTransaction {
  id: number
  saleId: number
  paymentMethodId: number
  paymentMethodName?: string
  amount: number
  reference?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  // Mercado Pago fields
  mpPaymentId?: string
  mpStatus?: string
  mpStatusDetail?: string
  mpPaymentType?: string
  mpMetadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// ============================================
// CART TYPES
// ============================================

export interface CartItem {
  productId: number
  productName: string
  productSku: string
  variantId?: number
  variantName?: string
  quantity: number
  unitPrice: number
  availableStock: number
  discountAmount: number
  discountPercentage: number
  taxPercentage: number
  taxAmount: number
  total: number
  imageUrl?: string
}

export interface Cart {
  items: CartItem[]
  customerId?: number
  customerName?: string
  subtotal: number
  totalDiscount: number
  totalTax: number
  total: number
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface CreateSaleData {
  locationId: number
  customerId?: number
  items: CreateSaleItemData[]
  payments: CreatePaymentData[]
  notes?: string
  discountAmount?: number
}

export interface CreateSaleItemData {
  productId: number
  variantId?: number
  quantity: number
  unitPrice: number // Precio de venta (con impuesto incluido)
  discountAmount?: number
  taxAmount?: number
  taxRate?: number // Tasa de impuesto (ej: 16 para 16%)
  notes?: string
}

export interface CreatePaymentData {
  paymentMethodId: number
  amount: number
  reference?: string
}

// ============================================
// QUERY TYPES
// ============================================

export interface SaleFilters {
  locationId?: number
  customerId?: number
  soldById?: string
  status?: SaleStatus
  dateFrom?: Date
  dateTo?: Date
  minTotal?: number
  maxTotal?: number
  searchTerm?: string
  saleNumber?: string
}

export interface SaleListItem extends Sale {
  itemCount: number
}

export interface SalesListResponse {
  sales: SaleListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================
// REFUND TYPES
// ============================================

export interface Refund {
  id: number
  saleId: number
  amount: number
  reason: string
  refundedById: string
  refundedByName?: string
  notes?: string
  createdAt: Date
}

export interface CreateRefundData {
  saleId: number
  amount: number
  reason: string
  notes?: string
}
