/**
 * POS Service
 * Handles product search, sales creation, and POS operations
 */

import { createClient } from '@/lib/supabase/client'

export interface Product {
    id: number
    name: string
    sku: string
    price: number
    stock: number
    category_id: number
    category_name?: string
    image_url?: string
    tax_rate: number
}

export interface Category {
    id: number
    name: string
    description?: string
    product_count?: number
}

export interface CreateSaleData {
    customer_id?: number
    items: Array<{
        product_id: number
        quantity: number
        unit_price: number
        discount_amount: number
    }>
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    payment_method: 'cash' | 'card' | 'transfer'
    amount_paid: number
    change_amount: number
    notes?: string
}

class POSService {
    private supabase = createClient()

    async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
        try {
            const trimmedQuery = query.trim()
            if (!trimmedQuery) return []

            const { data, error } = await this.supabase
                .from('products')
                .select(`
          id,
          name,
          sku,
          selling_price,
          category_id,
          categories (name),
          inventory!inner (quantity_available)
        `)
                .or(`name.ilike.%${trimmedQuery}%,sku.ilike.%${trimmedQuery}%`)
                .eq('is_active', true)
                .limit(limit)

            if (error) throw error

            return data?.map((item: any) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                price: Number(item.selling_price),
                stock: Number(item.inventory?.[0]?.quantity_available || 0),
                category_id: item.category_id,
                category_name: item.categories?.name,
                tax_rate: 16
            })) || []
        } catch (error) {
            console.error('Error searching products:', error)
            return []
        }
    }

    async getProductsByCategory(categoryId?: number, limit: number = 50): Promise<Product[]> {
        try {
            let query = this.supabase
                .from('products')
                .select(`
          id,
          name,
          sku,
          selling_price,
          category_id,
          categories (name),
          inventory!inner (quantity_available)
        `)
                .eq('is_active', true)

            if (categoryId) {
                query = query.eq('category_id', categoryId)
            }

            const { data, error } = await query
                .order('name', { ascending: true })
                .limit(limit)

            if (error) throw error

            return data?.map((item: any) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                price: Number(item.selling_price),
                stock: Number(item.inventory?.[0]?.quantity_available || 0),
                category_id: item.category_id,
                category_name: item.categories?.name,
                tax_rate: 16
            })) || []
        } catch (error) {
            console.error('Error getting products by category:', error)
            return []
        }
    }

    async getQuickProducts(limit: number = 8): Promise<Product[]> {
        try {
            const { data: topProducts } = await this.supabase
                .from('sale_items')
                .select('product_id, quantity')
                .limit(100)

            if (!topProducts) return []

            const productSales = topProducts.reduce((acc: Record<number, number>, item) => {
                acc[item.product_id] = (acc[item.product_id] || 0) + Number(item.quantity)
                return acc
            }, {})

            const topProductIds = Object.entries(productSales)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, limit)
                .map(([id]) => parseInt(id))

            if (topProductIds.length === 0) return []

            const { data, error } = await this.supabase
                .from('products')
                .select(`
          id,
          name,
          sku,
          selling_price,
          category_id,
          categories (name),
          inventory!inner (quantity_available)
        `)
                .in('id', topProductIds)
                .eq('is_active', true)

            if (error) throw error

            return data?.map((item: any) => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                price: Number(item.selling_price),
                stock: Number(item.inventory?.[0]?.quantity_available || 0),
                category_id: item.category_id,
                category_name: item.categories?.name,
                tax_rate: 16
            })) || []
        } catch (error) {
            console.error('Error getting quick products:', error)
            return []
        }
    }

    async getCategories(): Promise<Category[]> {
        try {
            const { data, error } = await this.supabase
                .from('categories')
                .select('id, name, description')
                .eq('is_active', true)
                .order('name', { ascending: true })

            if (error) throw error

            return data || []
        } catch (error) {
            console.error('Error getting categories:', error)
            return []
        }
    }

    async createSale(saleData: CreateSaleData): Promise<{ success: boolean; saleId?: number; error?: string }> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const { data: userData } = await this.supabase
                .from('user_details')
                .select('default_location_id, business_id')
                .eq('id', user.id)
                .single()

            if (!userData) throw new Error('User data not found')

            const saleNumber = `SALE-${Date.now()}`

            const { data: sale, error: saleError } = await this.supabase
                .from('sales')
                .insert({
                    sale_number: saleNumber,
                    customer_id: saleData.customer_id,
                    location_id: userData.default_location_id,
                    business_id: userData.business_id,
                    sold_by: user.id,
                    subtotal: saleData.subtotal,
                    tax_amount: saleData.tax_amount,
                    discount_amount: saleData.discount_amount,
                    total_amount: saleData.total_amount,
                    amount_paid: saleData.amount_paid,
                    change_amount: saleData.change_amount,
                    status: 'completed',
                    sale_type: 'regular',
                    notes: saleData.notes
                })
                .select()
                .single()

            if (saleError) throw saleError
            if (!sale) throw new Error('Sale not created')

            // Create sale items with line_total
            const saleItems = saleData.items.map(item => ({
                sale_id: sale.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: item.discount_amount,
                line_total: item.quantity * item.unit_price - item.discount_amount
            }))

            const { error: itemsError } = await this.supabase
                .from('sale_items')
                .insert(saleItems)

            if (itemsError) throw itemsError

            // Manually reduce inventory - ONLY IF IT EXISTS
            await this.reduceInventory(userData.default_location_id, saleData.items)

            return { success: true, saleId: sale.id }
        } catch (error) {
            console.error('Error creating sale:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error al crear la venta'
            }
        }
    }

    /**
     * Reduce inventory quantities after a sale
     * Only updates existing inventory records - does not create new ones
     */
    private async reduceInventory(locationId: number, items: CreateSaleData['items']) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await this.supabase
                .from('user_details')
                .select('business_id')
                .eq('id', user.id)
                .single()

            if (!userData) return

            for (const item of items) {
                // Get current inventory - DO NOT CREATE if not exists
                const { data: inventory, error: fetchError } = await this.supabase
                    .from('inventory')
                    .select('id, quantity_available')
                    .eq('product_id', item.product_id)
                    .eq('location_id', locationId)
                    .maybeSingle()

                if (fetchError) {
                    console.error('Error fetching inventory:', fetchError)
                    continue
                }

                if (!inventory) {
                    console.warn(`⚠️ Inventario no encontrado para producto ${item.product_id} en location ${locationId}`)
                    continue
                }

                const currentQty = inventory.quantity_available || 0
                const newQuantity = Math.max(0, currentQty - item.quantity)

                // Update inventory
                const { error } = await this.supabase
                    .from('inventory')
                    .update({
                        quantity_available: newQuantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inventory.id)

                if (error) {
                    console.error('Error reducing inventory:', error)
                    continue
                }

                // Create inventory movement record
                await this.supabase
                    .from('inventory_movements')
                    .insert({
                        business_id: userData.business_id,
                        inventory_id: inventory.id,
                        movement_type: 'sale',
                        quantity: -item.quantity,
                        quantity_before: currentQty,
                        quantity_after: newQuantity,
                        reference_type: 'sale',
                        notes: 'Reducción automática por venta POS',
                        performed_by: user.id
                    })
            }
        } catch (error) {
            console.error('Error in reduceInventory:', error)
        }
    }
}

export const posService = new POSService()
