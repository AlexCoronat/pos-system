/**
 * Dashboard Data Hook
 * Custom hook to fetch and manage dashboard data
 */

'use client'

import { useState, useEffect } from 'react'
import { dashboardService } from '@/lib/services/dashboard.service'
import type {
    DashboardStats,
    SalesChartData,
    TopProduct,
    RecentSale,
    LowStockProduct
} from '@/lib/services/dashboard.service'

export function useDashboardData(locationId?: number) {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [salesChart, setSalesChart] = useState<SalesChartData[]>([])
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [recentSales, setRecentSales] = useState<RecentSale[]>([])
    const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        async function fetchData() {
            try {
                setLoading(true)
                setError(null)

                const [statsData, chartData, productsData, salesData, stockData] = await Promise.all([
                    dashboardService.getStats(locationId),
                    dashboardService.getSalesChartData(locationId),
                    dashboardService.getTopProducts(locationId, 5),
                    dashboardService.getRecentSales(locationId, 5),
                    dashboardService.getLowStockProducts(locationId, 10)
                ])

                if (mounted) {
                    setStats(statsData)
                    setSalesChart(chartData)
                    setTopProducts(productsData)
                    setRecentSales(salesData)
                    setLowStockProducts(stockData)
                }
            } catch (err) {
                if (mounted) {
                    console.error('Error fetching dashboard data:', err)
                    setError(err instanceof Error ? err.message : 'Error al cargar datos')
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            mounted = false
        }
    }, [locationId])

    return {
        stats,
        salesChart,
        topProducts,
        recentSales,
        lowStockProducts,
        loading,
        error,
        refresh: () => {
            setLoading(true)
            // Trigger re-fetch by updating a dependency
        }
    }
}
