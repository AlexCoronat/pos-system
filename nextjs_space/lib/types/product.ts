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
  unit?: string
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
  quantity: number
  minStockLevel: number
  maxStockLevel?: number
  reorderPoint: number
  lastRestocked?: Date
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
  unit?: string
  costPrice: number
  salePrice: number
  taxRate?: number
  isTaxable?: boolean
  currency?: string
  variants?: {
    name: string
    sku?: string
    barcode?: string
    additionalPrice?: number
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
  unit?: string
  costPrice?: number
  salePrice?: number
  taxRate?: number
  isTaxable?: boolean
  currency?: string
}
