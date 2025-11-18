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
  name: string
  sku?: string
  additionalPrice: number
  isActive: boolean
}

export interface ProductWithPrice extends Product {
  price: ProductPrice
  variants?: ProductVariant[]
}

export interface InventoryItem {
  id: number
  productId: number
  variantId?: number
  locationId: number
  quantity: number
  minStockLevel: number
  reorderPoint: number
  lastRestocked?: Date
}

export interface ProductSearchResult {
  product: ProductWithPrice
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
  currency?: string
  variants?: {
    name: string
    sku?: string
    additionalPrice?: number
    isActive?: boolean
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
  currency?: string
}
