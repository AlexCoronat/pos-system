/**
 * Dashboard Service
 * Fetch dashboard data from Supabase using actual schema
 */

import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
    totalSales: number
    totalOrders: number
    totalCustomers: number
    lowStockItems: number
    salesChange: number
    ordersChange: number
}

export interface SalesChartData {
    date: string
    sales: number
}

export interface TopProduct {
    id: number
    name: string
    sales: number
    revenue: number
}

export interface RecentSale {
    id: number
    customerName: string
    date: string
    amount: number
    status: 'completed' | 'pending' | 'cancelled'
}

export interface LowStockProduct {
    id: number
    name: string
    currentStock: number
    minStock: number
    category: string
}

class DashboardService {
    private supabase = createClient()

    async getStats(): Promise<DashboardStats> {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            // Get today's sales
            const { data: todaySales } = await this.supabase
                .from('sales')
                .select('total_amount')
                .gte('created_at', today.toISOString())
                .eq('status', 'completed')

            const totalSales = todaySales?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0

            // Get today's orders count
            const { count: totalOrders } = await this.supabase
                .from('sales')
                .select('id', { count: 'exact' })
                .gte('created_at', today.toISOString())

            // Get total customers
            const { count: totalCustomers } = await this.supabase
                .from('customers')
                .select('id', { count: 'exact' })
                .eq('is_active', true)

            // Get low stock items (where available < min_stock_level)
            const { data: lowStockData } = await this.supabase
                .from('inventory')
                .select('id, quantity_available, min_stock_level')
                .lt('quantity_available', 10)

            const lowStockItems = lowStockData?.filter(item =>
                Number(item.quantity_available) < Number(item.min_stock_level || 10)
            ).length || 0

            return {
                totalSales,
                totalOrders: totalOrders || 0,
                totalCustomers: totalCustomers || 0,
                lowStockItems,
                salesChange: 0,
                ordersChange: 0
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error)
            return {
                totalSales: 0,
                totalOrders: 0,
                totalCustomers: 0,
                lowStockItems: 0,
                salesChange: 0,
                ordersChange: 0
            }
        }
    }

    async getSalesChartData(): Promise<SalesChartData[]> {
        try {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - 6)
            startDate.setHours(0, 0, 0, 0)

            // Use sale_date for filtering instead of created_at
            const { data: sales } = await this.supabase
                .from('sales')
                .select('sale_date, total_amount')
                .gte('sale_date', startDate.toISOString())
                .lte('sale_date', endDate.toISOString())
                .eq('status', 'completed')

            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
            const salesByDate: Record<string, number> = {}

            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate)
                date.setDate(date.getDate() + i)
                salesByDate[date.toISOString().split('T')[0]] = 0
            }

            sales?.forEach(sale => {
                // Handle both timestamp and date formats
                const saleDate = sale.sale_date?.split('T')[0] || sale.sale_date
                if (salesByDate[saleDate] !== undefined) {
                    salesByDate[saleDate] += Number(sale.total_amount || 0)
                }
            })

            return Object.entries(salesByDate).map(([dateStr, sales]) => {
                const date = new Date(dateStr + 'T12:00:00') // Add noon to avoid timezone issues
                return { date: days[date.getDay()], sales }
            })
        } catch (error) {
            console.error('Error fetching sales chart data:', error)
            return []
        }
    }

    async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
        try {
            const { data: saleItems } = await this.supabase
                .from('sale_items')
                .select('product_id, quantity, unit_price, products (id, name)')

            if (!saleItems) return []

            const productMap: Record<number, { name: string; sales: number; revenue: number }> = {}

            saleItems.forEach((item: any) => {
                if (!item.products) return
                const productId = item.product_id
                if (!productMap[productId]) {
                    productMap[productId] = { name: item.products.name, sales: 0, revenue: 0 }
                }
                productMap[productId].sales += Number(item.quantity || 0)
                productMap[productId].revenue += Number(item.quantity || 0) * Number(item.unit_price || 0)
            })

            return Object.entries(productMap)
                .map(([id, data]) => ({ id: parseInt(id), ...data }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, limit)
        } catch (error) {
            console.error('Error fetching top products:', error)
            return []
        }
    }

    async getRecentSales(limit: number = 5): Promise<RecentSale[]> {
        try {
            const { data: sales } = await this.supabase
                .from('sales')
                .select(`
          id,
          created_at,
          total_amount,
          status,
          customers (first_name, last_name)
        `)
                .order('created_at', { ascending: false })
                .limit(limit)

            return sales?.map((sale: any) => {
                const customer = sale.customers
                const now = new Date()
                const saleDate = new Date(sale.created_at)
                const diffMs = now.getTime() - saleDate.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                const diffHours = Math.floor(diffMs / 3600000)

                let timeAgo: string
                if (diffMins < 60) {
                    timeAgo = `Hace ${diffMins} min`
                } else if (diffHours < 24) {
                    timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
                } else {
                    timeAgo = saleDate.toLocaleDateString('es-MX')
                }

                return {
                    id: sale.id,
                    customerName: customer ? `${customer.first_name} ${customer.last_name}` : 'Cliente General',
                    date: timeAgo,
                    amount: Number(sale.total_amount || 0),
                    status: sale.status
                }
            }) || []
        } catch (error) {
            console.error('Error fetching recent sales:', error)
            return []
        }
    }

    async getLowStockProducts(limit: number = 10): Promise<LowStockProduct[]> {
        try {
            const { data: inventory } = await this.supabase
                .from('inventory')
                .select(`
          product_id,
          quantity_available,
          min_stock_level,
          products (
            id,
            name,
            category_id,
            categories (name)
          )
        `)
                .order('quantity_available', { ascending: true })
                .limit(limit * 2) // Get more to filter

            if (!inventory) return []

            // Filter where quantity < min_stock
            const lowStock = inventory.filter((item: any) =>
                Number(item.quantity_available) < Number(item.min_stock_level || 10)
            )

            return lowStock.slice(0, limit).map((item: any) => {
                const product = item.products
                const category = product?.categories

                return {
                    id: product?.id || 0,
                    name: product?.name || 'Unknown',
                    currentStock: Number(item.quantity_available || 0),
                    minStock: Number(item.min_stock_level || 10),
                    category: category?.name || 'Sin categoría'
                }
            })
        } catch (error) {
            console.error('Error fetching low stock products:', error)
            return []
        }
    }
}

export const dashboardService = new DashboardService()
