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

/**
 * Product Variant - represents a specific variation of a product
 * (e.g., "Red-Large", "Chocolate-500g", "Blue Pen")
 */
export interface ProductVariant {
  id?: number
  productId: number
  variantName: string        // Display name: "Rojo - Grande"
  sku: string                 // Unique SKU for this variant
  barcode?: string            // Optional barcode
  attributes?: Record<string, string>  // Flexible attributes {color: "Rojo", size: "Grande"}
  costPrice?: number
  sellingPrice?: number
  imageUrl?: string           // Variant-specific image
  isActive: boolean
  stock?: number              // Available stock (calculated from inventory)
  createdAt?: Date
  updatedAt?: Date
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

/**
 * Variant Attribute - represents a characteristic that varies
 * (e.g., Color: [Red, Blue, Green])
 */
export interface VariantAttribute {
  name: string                // "Color", "Talla", "Sabor", etc.
  values: string[]            // ["Rojo", "Azul", "Verde"]
}

/**
 * Variant Combination - auto-generated combination of attributes
 */
export interface VariantCombination {
  name: string                     // "Rojo - Grande"
  attributes: Record<string, string>  // {color: "Rojo", size: "Grande"}
  sku?: string
  costPrice?: number
  sellingPrice?: number
}

/**
 * Create Product Data - includes optional variants
 */
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
  hasVariants?: boolean
  variants?: CreateVariantData[]
  // Service fields
  isService?: boolean
  durationMinutes?: number
  requiresAppointment?: boolean
}

/**
 * Create Variant Data - for creating a single variant
 */
export interface CreateVariantData {
  productId?: number          // Optional during product creation
  variantName: string
  sku: string
  barcode?: string
  attributes?: Record<string, string>
  costPrice?: number
  sellingPrice?: number
  imageUrl?: string
  isActive?: boolean
}

/**
 * Update Variant Data - for updating a variant
 */
export interface UpdateVariantData {
  variantName?: string
  sku?: string
  barcode?: string
  attributes?: Record<string, string>
  costPrice?: number
  sellingPrice?: number
  imageUrl?: string
  isActive?: boolean
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
  hasVariants?: boolean
  // Service fields
  isService?: boolean
  durationMinutes?: number
  requiresAppointment?: boolean
}
