import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'
import { getCategoryPrefix, generateSKU, generateInternalBarcode } from '@/lib/utils/product-codes'
import type {
  Product,
  ProductWithPrice,
  ProductSearchResult,
  CreateProductData,
  UpdateProductData,
  ProductVariant,
  CreateVariantData,
  UpdateVariantData,
  VariantAttribute,
  VariantCombination
} from '@/lib/types/product'

export interface ProductFilters {
  categoryId?: number
  isActive?: boolean
  searchTerm?: string
  minPrice?: number
  maxPrice?: number
}

export interface ProductsListResponse {
  products: ProductWithPrice[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

class ProductService {
  /**
   * Search products by name or SKU with inventory information
   * This is used for the POS search functionality
   */
  async searchProducts(
    searchTerm: string,
    locationId: number
  ): Promise<ProductSearchResult[]> {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return []
      }

      const { data, error } = await supabase
        .rpc('search_products_with_inventory', {
          p_search_term: searchTerm,
          p_location_id: locationId
        })

      if (error) throw error

      // Transform the flat RPC results into ProductSearchResult format
      return (data || []).map((item: any) => ({
        product: {
          id: item.product_id,
          sku: item.product_sku,
          name: item.product_name,
          description: item.product_description,
          categoryId: item.category_id,
          categoryName: item.category_name,
          isActive: true,
          imageUrl: item.image_url,
          barcode: item.product_barcode,
          unit: item.unit_of_measure,
          sellingPrice: item.selling_price || 0,
          costPrice: item.cost_price || 0,
          taxRate: item.tax_rate || 16,
          isTaxable: item.is_taxable ?? true
        },
        inventory: {
          id: item.inventory_id,
          productId: item.product_id,
          locationId: locationId,
          quantity: item.available_stock || 0,
          minStockLevel: 0,
          reorderPoint: 0
        },
        availableStock: item.available_stock || 0
      }))
    } catch (error: any) {
      console.error('Error searching products:', error)
      throw new Error(error.message || 'Error al buscar productos')
    }
  }

  /**
   * Get all products with optional filters and pagination
   */
  async getProducts(
    filters: ProductFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ProductsListResponse> {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(
            id,
            name
          )
        `, { count: 'exact' })

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,sku.ilike.%${filters.searchTerm}%`)
      }

      if (filters.minPrice) {
        query = query.gte('selling_price', filters.minPrice)
      }

      if (filters.maxPrice) {
        query = query.lte('selling_price', filters.maxPrice)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      // Order by name
      query = query.order('name', { ascending: true })

      const { data, error, count } = await query

      if (error) throw error

      // Transform the data to match our types
      const products: ProductWithPrice[] = (data || []).map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        categoryId: item.category_id,
        categoryName: item.category?.name,
        isActive: item.is_active,
        imageUrl: item.image_url,
        barcode: item.barcode,
        unit: item.unit_of_measure,
        price: {
          id: item.id,
          productId: item.id,
          costPrice: item.cost_price || 0,
          salePrice: item.selling_price || 0,
          currency: 'MXN',
          isActive: true
        },
        variants: item.variants || [],
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }))

      return {
        products,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    } catch (error: any) {
      console.error('Error getting products:', error)
      throw new Error(error.message || 'Error al obtener productos')
    }
  }

  /**
   * Get a single product by ID with all related data
   */
  async getProductById(productId: number): Promise<ProductWithPrice> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(
            id,
            name
          )
        `)
        .eq('id', productId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Producto no encontrado')

      return {
        id: data.id,
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.category_id,
        categoryName: data.category?.name,
        isActive: data.is_active,
        imageUrl: data.image_url,
        barcode: data.barcode,
        unit: data.unit_of_measure,
        price: {
          id: data.id,
          productId: data.id,
          costPrice: data.cost_price || 0,
          salePrice: data.selling_price || 0,
          currency: 'MXN',
          isActive: true
        },
        variants: data.variants || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error: any) {
      console.error('Error getting product:', error)
      throw new Error(error.message || 'Error al obtener producto')
    }
  }

  /**
   * Create a new product with price
   */
  async createProduct(data: CreateProductData): Promise<ProductWithPrice> {
    try {
      // Get business context
      const { businessId } = await getBusinessContext()

      // Create product with prices directly in the products table
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          business_id: businessId,
          sku: data.sku,
          name: data.name,
          description: data.description,
          category_id: data.categoryId,
          is_active: data.isActive ?? true,
          image_url: data.imageUrl,
          barcode: data.barcode,
          unit_of_measure: data.unit,
          cost_price: data.costPrice,
          selling_price: data.salePrice,
          tax_rate: data.taxRate || 16,
          is_taxable: data.isTaxable ?? true,
          // Service fields
          is_service: data.isService ?? false,
          duration_minutes: data.durationMinutes || null,
          requires_appointment: data.requiresAppointment ?? false
        })
        .select()
        .single()

      if (productError) throw productError

      // Create variants if provided
      let variants: ProductVariant[] = []
      if (data.variants && data.variants.length > 0) {
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .insert(
            data.variants.map(v => ({
              product_id: product.id,
              variant_name: v.variantName,
              sku: v.sku,
              barcode: v.barcode,
              attributes: v.attributes,
              cost_price: v.costPrice || 0,
              selling_price: v.sellingPrice || 0,
              image_url: v.imageUrl,
              is_active: v.isActive ?? true
            }))
          )
          .select()

        if (variantsError) {
          console.error('Error creating variants:', variantsError)
        } else {
          variants = (variantsData || []).map(item => ({
            id: item.id,
            productId: item.product_id,
            variantName: item.variant_name,
            sku: item.sku,
            barcode: item.barcode,
            attributes: item.attributes,
            costPrice: item.cost_price,
            sellingPrice: item.selling_price,
            imageUrl: item.image_url,
            isActive: item.is_active
          }))
        }
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        categoryId: product.category_id,
        isActive: product.is_active,
        imageUrl: product.image_url,
        barcode: product.barcode,
        unit: product.unit_of_measure,
        price: {
          id: product.id,
          productId: product.id,
          costPrice: product.cost_price || 0,
          salePrice: product.selling_price || 0,
          currency: 'MXN',
          isActive: true
        },
        variants,
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at)
      }
    } catch (error: any) {
      console.error('Error creating product:', error)
      throw new Error(error.message || 'Error al crear producto')
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    productId: number,
    data: UpdateProductData
  ): Promise<ProductWithPrice> {
    try {
      const updateData: any = {}

      if (data.sku) updateData.sku = data.sku
      if (data.name) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.categoryId) updateData.category_id = data.categoryId
      if (data.isActive !== undefined) updateData.is_active = data.isActive
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl
      if (data.barcode !== undefined) updateData.barcode = data.barcode
      if (data.unit !== undefined) updateData.unit_of_measure = data.unit
      if (data.costPrice !== undefined) updateData.cost_price = data.costPrice
      if (data.salePrice !== undefined) updateData.selling_price = data.salePrice
      if (data.taxRate !== undefined) updateData.tax_rate = data.taxRate
      if (data.isTaxable !== undefined) updateData.is_taxable = data.isTaxable
      // Service fields
      if (data.isService !== undefined) updateData.is_service = data.isService
      if (data.durationMinutes !== undefined) updateData.duration_minutes = data.durationMinutes || null
      if (data.requiresAppointment !== undefined) updateData.requires_appointment = data.requiresAppointment

      const { error: productError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)

      if (productError) throw productError

      // Get updated product
      return await this.getProductById(productId)
    } catch (error: any) {
      console.error('Error updating product:', error)
      throw new Error(error.message || 'Error al actualizar producto')
    }
  }

  /**
   * Soft delete a product (set is_active to false)
   */
  async deleteProduct(productId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting product:', error)
      throw new Error(error.message || 'Error al eliminar producto')
    }
  }

  /**
   * Get product variants for a specific product
   */
  async getProductVariants(productId: number): Promise<ProductVariant[]> {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('variant_name', { ascending: true })

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        variantName: item.variant_name,
        sku: item.sku,
        barcode: item.barcode,
        attributes: item.attributes,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        imageUrl: item.image_url,
        isActive: item.is_active,
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
      }))
    } catch (error: any) {
      console.error('Error getting product variants:', error)
      throw new Error(error.message || 'Error al obtener variantes')
    }
  }

  /**
   * Create a new variant for a product
   */
  async createVariant(productId: number, data: CreateVariantData): Promise<ProductVariant> {
    try {
      // Validate SKU uniqueness
      const skuExists = await this.checkVariantSkuExists(data.sku)
      if (skuExists) {
        throw new Error('El SKU ya existe. Por favor usa un SKU único.')
      }

      const { data: variant, error } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          variant_name: data.variantName,
          sku: data.sku,
          barcode: data.barcode,
          attributes: data.attributes,
          cost_price: data.costPrice,
          selling_price: data.sellingPrice,
          image_url: data.imageUrl,
          is_active: data.isActive ?? true
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: variant.id,
        productId: variant.product_id,
        variantName: variant.variant_name,
        sku: variant.sku,
        barcode: variant.barcode,
        attributes: variant.attributes,
        costPrice: variant.cost_price,
        sellingPrice: variant.selling_price,
        imageUrl: variant.image_url,
        isActive: variant.is_active,
        createdAt: new Date(variant.created_at)
      }
    } catch (error: any) {
      console.error('Error creating variant:', error)
      throw new Error(error.message || 'Error al crear variante')
    }
  }

  /**
   * Update an existing variant
   */
  async updateVariant(variantId: number, data: UpdateVariantData): Promise<ProductVariant> {
    try {
      const updateData: any = {}

      if (data.variantName !== undefined) updateData.variant_name = data.variantName
      if (data.sku !== undefined) {
        // Validate new SKU if changed
        const skuExists = await this.checkVariantSkuExists(data.sku, variantId)
        if (skuExists) {
          throw new Error('El SKU ya existe. Por favor usa un SKU único.')
        }
        updateData.sku = data.sku
      }
      if (data.barcode !== undefined) updateData.barcode = data.barcode
      if (data.attributes !== undefined) updateData.attributes = data.attributes
      if (data.costPrice !== undefined) updateData.cost_price = data.costPrice
      if (data.sellingPrice !== undefined) updateData.selling_price = data.sellingPrice
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl
      if (data.isActive !== undefined) updateData.is_active = data.isActive

      updateData.updated_at = new Date().toISOString()

      const { data: variant, error } = await supabase
        .from('product_variants')
        .update(updateData)
        .eq('id', variantId)
        .select()
        .single()

      if (error) throw error

      return {
        id: variant.id,
        productId: variant.product_id,
        variantName: variant.variant_name,
        sku: variant.sku,
        barcode: variant.barcode,
        attributes: variant.attributes,
        costPrice: variant.cost_price,
        sellingPrice: variant.selling_price,
        imageUrl: variant.image_url,
        isActive: variant.is_active,
        updatedAt: new Date(variant.updated_at)
      }
    } catch (error: any) {
      console.error('Error updating variant:', error)
      throw new Error(error.message || 'Error al actualizar variante')
    }
  }

  /**
   * Delete a variant (soft delete)
   */
  async deleteVariant(variantId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ is_active: false })
        .eq('id', variantId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting variant:', error)
      throw new Error(error.message || 'Error al eliminar variante')
    }
  }

  /**
   * Check if a variant SKU already exists
   * Checks both products and product_variants tables
   */
  async checkVariantSkuExists(sku: string, excludeVariantId?: number): Promise<boolean> {
    try {
      // Check in products table
      const { data: productData } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .maybeSingle()

      if (productData) return true

      // Check in product_variants table
      let query = supabase
        .from('product_variants')
        .select('id')
        .eq('sku', sku)

      if (excludeVariantId) {
        query = query.neq('id', excludeVariantId)
      }

      const { data: variantData } = await query.maybeSingle()

      return !!variantData
    } catch (error: any) {
      console.error('Error checking variant SKU:', error)
      return false
    }
  }

  /**
   * Generate all possible combinations from variant attributes
   * Example: Color: [Red, Blue], Size: [S, M] => 4 combinations
   */
  generateVariantCombinations(
    attributes: VariantAttribute[],
    basePrice: number = 0
  ): VariantCombination[] {
    if (!attributes || attributes.length === 0) {
      return []
    }

    // Helper function to generate cartesian product
    const cartesianProduct = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap(a => curr.map(c => [...a, c]))
      }, [[]] as string[][])
    }

    // Extract values arrays
    const valuesArrays = attributes.map(attr => attr.values)

    // Generate all combinations
    const combinations = cartesianProduct(valuesArrays)

    // Transform into VariantCombination format
    return combinations.map((combo, index) => {
      const attrs: Record<string, string> = {}
      const nameParts: string[] = []

      combo.forEach((value, idx) => {
        const attrName = attributes[idx].name
        attrs[attrName.toLowerCase()] = value
        nameParts.push(value)
      })

      return {
        name: nameParts.join(' - '),
        attributes: attrs,
        sku: '', // Will be generated later
        costPrice: basePrice,
        sellingPrice: basePrice
      }
    })
  }

  /**
   * Generate a unique SKU for a variant
   */
  async generateVariantSKU(
    productSku: string,
    variantIndex: number
  ): Promise<string> {
    // Format: PROD-SKU-V01, PROD-SKU-V02, etc.
    const variantSuffix = `V${String(variantIndex).padStart(2, '0')}`
    let sku = `${productSku}-${variantSuffix}`

    // Ensure uniqueness
    let counter = 0
    while (await this.checkVariantSkuExists(sku)) {
      counter++
      sku = `${productSku}-${variantSuffix}-${counter}`
    }

    return sku
  }

  /**
   * Check if a SKU already exists
   */
  async checkSkuExists(sku: string, excludeProductId?: number): Promise<boolean> {
    try {
      let query = supabase
        .from('products')
        .select('id')
        .eq('sku', sku)

      if (excludeProductId) {
        query = query.neq('id', excludeProductId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        throw error
      }

      return !!data
    } catch (error: any) {
      console.error('Error checking SKU:', error)
      return false
    }
  }

  /**
   * Generate the next available SKU for a category
   * @param categoryName - The category name to generate prefix from
   * @param forceNew - If true, adds a random offset to generate a different SKU
   */
  async generateNextSKU(categoryName: string, forceNew: boolean = false): Promise<string> {
    try {
      const prefix = getCategoryPrefix(categoryName || 'General')

      // Find the highest existing SKU with this prefix
      const { data, error } = await supabase
        .from('products')
        .select('sku')
        .like('sku', `${prefix}-%`)
        .order('sku', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error finding last SKU:', error)
      }

      let nextNumber = 1

      if (data?.sku) {
        // Extract the number from the existing SKU (e.g., "BEB-042" -> 42)
        const match = data.sku.match(/-(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1
        }
      }

      // Add random offset when forcing a new value
      if (forceNew) {
        nextNumber += Math.floor(Math.random() * 10) + 1
      }

      return generateSKU(prefix, nextNumber)
    } catch (error: any) {
      console.error('Error generating SKU:', error)
      // Fallback to a random SKU
      const prefix = getCategoryPrefix(categoryName || 'General')
      const random = Math.floor(Math.random() * 900) + 100
      return generateSKU(prefix, random)
    }
  }

  /**
   * Generate a suggested internal barcode for a new product
   * Uses the next available product ID estimation
   * @param forceNew - If true, adds a random offset to generate a different barcode
   */
  async generateSuggestedBarcode(forceNew: boolean = false): Promise<string> {
    try {
      const { businessId } = await getBusinessContext()

      // Get the highest product ID to estimate the next one
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error finding last product ID:', error)
      }

      let nextProductId = (data?.id || 0) + 1

      // Add random offset when forcing a new value
      if (forceNew) {
        nextProductId += Math.floor(Math.random() * 100) + 1
      }

      return generateInternalBarcode(businessId, nextProductId)
    } catch (error: any) {
      console.error('Error generating barcode:', error)
      // Fallback to random barcode
      const random = Math.floor(Math.random() * 9000000) + 1000000
      return generateInternalBarcode(1, random)
    }
  }

  // ============================================
  // CATEGORY METHODS
  // ============================================

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        parentId: item.parent_id,
        icon: item.icon,
        displayOrder: item.display_order,
        isActive: item.is_active,
        createdAt: new Date(item.created_at)
      }))
    } catch (error: any) {
      console.error('Error getting categories:', error)
      throw new Error(error.message || 'Error al obtener categorías')
    }
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      const { businessId } = await getBusinessContext()

      const { data: category, error } = await supabase
        .from('categories')
        .insert({
          business_id: businessId,
          name: data.name,
          description: data.description,
          parent_id: data.parentId,
          icon: data.icon,
          display_order: data.displayOrder || 0,
          is_active: data.isActive ?? true
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parent_id,
        icon: category.icon,
        displayOrder: category.display_order,
        isActive: category.is_active,
        createdAt: new Date(category.created_at)
      }
    } catch (error: any) {
      console.error('Error creating category:', error)
      throw new Error(error.message || 'Error al crear categoría')
    }
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId: number, data: Partial<CreateCategoryData>): Promise<Category> {
    try {
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.parentId !== undefined) updateData.parent_id = data.parentId
      if (data.icon !== undefined) updateData.icon = data.icon
      if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder
      if (data.isActive !== undefined) updateData.is_active = data.isActive

      const { data: category, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', categoryId)
        .select()
        .single()

      if (error) throw error

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parent_id,
        icon: category.icon,
        displayOrder: category.display_order,
        isActive: category.is_active,
        createdAt: new Date(category.created_at)
      }
    } catch (error: any) {
      console.error('Error updating category:', error)
      throw new Error(error.message || 'Error al actualizar categoría')
    }
  }

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(categoryId: number): Promise<void> {
    try {
      // Check if category has products
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .is('deleted_at', null)

      if (count && count > 0) {
        throw new Error('No se puede eliminar una categoría con productos asignados')
      }

      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', categoryId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting category:', error)
      throw new Error(error.message || 'Error al eliminar categoría')
    }
  }
}

// Types for categories
export interface Category {
  id: number
  name: string
  description?: string
  parentId?: number
  icon?: string
  displayOrder: number
  isActive: boolean
  createdAt: Date
}

export interface CreateCategoryData {
  name: string
  description?: string
  parentId?: number
  icon?: string
  displayOrder?: number
  isActive?: boolean
}

export const productService = new ProductService()
