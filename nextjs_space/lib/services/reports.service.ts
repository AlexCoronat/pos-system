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

    async getDailySales(
        businessId: number,
        startDate: string,
        endDate: string,
        locationId?: number
    ) {
        let query = this.supabase
            .from('mv_daily_sales_by_location')
            .select('*')
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)

        if (locationId) {
            query = query.eq('location_id', locationId)
        } else {
            const { data: locations } = await this.supabase
                .from('locations')
                .select('id')
                .eq('business_id', businessId)

            if (locations && locations.length > 0) {
                const locationIds = locations.map(l => l.id)
                query = query.in('location_id', locationIds)
            } else {
                return []
            }
        }

        const { data, error } = await query.order('sale_date', { ascending: true })

        if (error) {
            console.error('Error fetching daily sales:', error)
            throw error
        }

        return data as DailySalesData[]
    }

    async getTopSellingProducts(businessId: number, limit = 10, locationId?: number) {
        let query = this.supabase
            .from('mv_top_selling_products')
            .select('*')

        if (locationId) {
            query = query.eq('location_id', locationId)
        } else {
            const { data: locations } = await this.supabase
                .from('locations')
                .select('id')
                .eq('business_id', businessId)

            if (locations && locations.length > 0) {
                const locationIds = locations.map(l => l.id)
                query = query.in('location_id', locationIds)
            } else {
                return []
            }
        }

        const { data, error } = await query
            .order('total_revenue', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching top products:', error)
            throw error
        }

        return data as TopProductData[]
    }
}

export const reportsService = new ReportsService()
