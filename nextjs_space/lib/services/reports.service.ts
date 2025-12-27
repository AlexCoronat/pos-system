import { createClient } from '@/lib/supabase/client'

export type DailySalesData = {
    location_id: number
    sale_date: string
    total_transactions: number
    total_sales: number
    total_subtotal: number
    total_tax: number
    total_discount: number
}

export type TopProductData = {
    product_id: number
    product_name: string
    product_sku: string
    location_id: number
    total_quantity_sold: number
    total_revenue: number
    transaction_count: number
}

class ReportsService {
    private supabase = createClient()

    /**
     * Get daily sales data by querying the sales table directly
     * This provides real-time data without needing to refresh materialized views
     */
    async getDailySales(
        businessId: number,
        startDate: string,
        endDate: string,
        locationId?: number
    ): Promise<DailySalesData[]> {
        try {
            // Build the query to get sales aggregated by date and location
            let query = this.supabase
                .from('sales')
                .select(`
                    location_id,
                    sale_date,
                    total_amount,
                    subtotal,
                    tax_amount,
                    discount_amount
                `)
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .neq('sale_type', 'return')
                .gte('sale_date', startDate)
                .lte('sale_date', `${endDate}T23:59:59`)

            if (locationId) {
                query = query.eq('location_id', locationId)
            }

            const { data, error } = await query.order('sale_date', { ascending: true })

            if (error) {
                console.error('Error fetching sales:', error)
                throw error
            }

            if (!data || data.length === 0) {
                return []
            }

            // Aggregate by date and location in JavaScript
            const aggregated = new Map<string, DailySalesData>()

            for (const sale of data) {
                // Extract just the date part
                const saleDate = new Date(sale.sale_date).toISOString().split('T')[0]
                const key = `${sale.location_id}-${saleDate}`

                if (aggregated.has(key)) {
                    const existing = aggregated.get(key)!
                    existing.total_transactions += 1
                    existing.total_sales += Number(sale.total_amount) || 0
                    existing.total_subtotal += Number(sale.subtotal) || 0
                    existing.total_tax += Number(sale.tax_amount) || 0
                    existing.total_discount += Number(sale.discount_amount) || 0
                } else {
                    aggregated.set(key, {
                        location_id: sale.location_id,
                        sale_date: saleDate,
                        total_transactions: 1,
                        total_sales: Number(sale.total_amount) || 0,
                        total_subtotal: Number(sale.subtotal) || 0,
                        total_tax: Number(sale.tax_amount) || 0,
                        total_discount: Number(sale.discount_amount) || 0
                    })
                }
            }

            // Convert to array and sort by date
            return Array.from(aggregated.values()).sort((a, b) =>
                a.sale_date.localeCompare(b.sale_date)
            )
        } catch (error) {
            console.error('Error in getDailySales:', error)
            throw error
        }
    }

    /**
     * Get top selling products by querying sale_items directly
     * This provides real-time data without needing to refresh materialized views
     */
    async getTopSellingProducts(
        businessId: number,
        limit = 10,
        locationId?: number
    ): Promise<TopProductData[]> {
        try {
            // First get valid sale IDs for this business
            let salesQuery = this.supabase
                .from('sales')
                .select('id, location_id')
                .eq('business_id', businessId)
                .eq('status', 'completed')
                .neq('sale_type', 'return')

            if (locationId) {
                salesQuery = salesQuery.eq('location_id', locationId)
            }

            const { data: sales, error: salesError } = await salesQuery

            if (salesError) {
                console.error('Error fetching sales for top products:', salesError)
                throw salesError
            }

            if (!sales || sales.length === 0) {
                return []
            }

            const saleIds = sales.map(s => s.id)
            const saleLocationMap = new Map(sales.map(s => [s.id, s.location_id]))

            // Get sale items with product info
            const { data: saleItems, error: itemsError } = await this.supabase
                .from('sale_items')
                .select(`
                    sale_id,
                    product_id,
                    quantity,
                    line_total,
                    product:products(id, name, sku)
                `)
                .in('sale_id', saleIds)

            if (itemsError) {
                console.error('Error fetching sale items:', itemsError)
                throw itemsError
            }

            if (!saleItems || saleItems.length === 0) {
                return []
            }

            // Aggregate by product
            const productStats = new Map<number, TopProductData>()

            for (const item of saleItems) {
                const product = item.product as any
                if (!product) continue

                const locationIdForItem = saleLocationMap.get(item.sale_id) || 0

                if (productStats.has(item.product_id)) {
                    const existing = productStats.get(item.product_id)!
                    existing.total_quantity_sold += Number(item.quantity) || 0
                    existing.total_revenue += Number(item.line_total) || 0
                    existing.transaction_count += 1
                } else {
                    productStats.set(item.product_id, {
                        product_id: item.product_id,
                        product_name: product.name || 'Producto',
                        product_sku: product.sku || '',
                        location_id: locationIdForItem,
                        total_quantity_sold: Number(item.quantity) || 0,
                        total_revenue: Number(item.line_total) || 0,
                        transaction_count: 1
                    })
                }
            }

            // Convert to array, sort by revenue, and limit
            return Array.from(productStats.values())
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, limit)
        } catch (error) {
            console.error('Error in getTopSellingProducts:', error)
            throw error
        }
    }
}

export const reportsService = new ReportsService()
