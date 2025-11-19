/**
 * Types for Products Module
 */

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  categoryId: number
  categoryName?: string
  isActive: boolean
  imageUrl?: string
  barcode?: string
  unitOfMeasure?: string
  costPrice?: number
  sellingPrice?: number
  taxRate?: number
  isTaxable?: boolean
  hasVariants?: boolean
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface ProductPrice {
  id: number
  productId: number
  variantId?: number
  costPrice: number
  salePrice: number
  currency: string
  isActive: boolean
}

export interface ProductVariant {
  id: number
  productId: number
  variantName: string
  sku?: string
  barcode?: string
  costPrice?: number
  sellingPrice?: number
  isActive: boolean
  attributes?: Record<string, any>
}

export interface ProductWithPrice extends Product {
  price: ProductPrice
  variants?: ProductVariant[]
}

export interface InventoryItem {
  id?: number
  productId: number
  variantId?: number
  locationId: number
  quantityAvailable: number
  quantityReserved: number
  minStockLevel: number
  maxStockLevel?: number
  reorderPoint: number
  lastRestockDate?: Date
  lastRestockQuantity?: number
  isTracked?: boolean
}

export interface ProductSearchResult {
  product: Product & {
    variants?: ProductVariant[]
  }
  inventory: InventoryItem
  availableStock: number
}

export interface CreateProductData {
  sku: string
  name: string
  description?: string
  categoryId: number
  isActive?: boolean
  imageUrl?: string
  barcode?: string
  unitOfMeasure?: string
  costPrice: number
  sellingPrice: number
  taxRate?: number
  isTaxable?: boolean
  currency?: string
  variants?: {
    variantName: string
    sku?: string
    barcode?: string
    costPrice?: number
    sellingPrice?: number
    isActive?: boolean
    attributes?: Record<string, any>
  }[]
}

export interface UpdateProductData {
  sku?: string
  name?: string
  description?: string
  categoryId?: number
  isActive?: boolean
  imageUrl?: string
  barcode?: string
  unitOfMeasure?: string
  costPrice?: number
  sellingPrice?: number
  taxRate?: number
  isTaxable?: boolean
  currency?: string
}
