import { supabase } from '@/lib/supabase/client'
import type {
  Product,
  ProductWithPrice,
  ProductSearchResult,
  CreateProductData,
  UpdateProductData,
  ProductVariant
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

      return data || []
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
          ),
          variants:product_variants(
            id,
            product_id,
            variant_name,
            sku,
            cost_price,
            selling_price,
            is_active
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
          ),
          variants:product_variants(
            id,
            product_id,
            variant_name,
            sku,
            cost_price,
            selling_price,
            is_active
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
      // Create product with prices directly in the products table
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
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
          is_taxable: data.isTaxable ?? true
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
              variant_name: v.name,
              sku: v.sku,
              cost_price: v.additionalPrice || 0,
              selling_price: v.additionalPrice || 0,
              is_active: v.isActive ?? true
            }))
          )
          .select()

        if (variantsError) {
          console.error('Error creating variants:', variantsError)
        } else {
          variants = variantsData || []
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
        .order('name', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error: any) {
      console.error('Error getting product variants:', error)
      throw new Error(error.message || 'Error al obtener variantes')
    }
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

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return !!data
    } catch (error: any) {
      console.error('Error checking SKU:', error)
      return false
    }
  }
}

export const productService = new ProductService()
