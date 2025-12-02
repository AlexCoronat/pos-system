/**
 * Admin Dashboard Page
 * Integrates real data from database via dashboard service
 */

'use client'

import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { StatsCards } from '@/components/admin/widgets/StatsCards'
import { SalesChart } from '@/components/admin/widgets/SalesChart'
import { TopProducts } from '@/components/admin/widgets/TopProducts'
import { RecentSales } from '@/components/admin/widgets/RecentSales'
import { LowStockAlert } from '@/components/admin/widgets/LowStockAlert'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const {
    stats,
    salesChart,
    topProducts,
    recentSales,
    lowStockProducts,
    loading,
    error
  } = useDashboardData()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto mb-3" />
          <p className="text-gray-500">Cargando Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error al cargar el dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-gray-600 text-xs mt-2">
          Mostrando vista vacía. El dashboard funcionará completamente después de ejecutar la migración de base de datos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={stats || undefined} />

      {/* Sales Chart and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={salesChart} />
        <TopProducts products={topProducts} />
      </div>

      {/* Recent Sales and Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentSales sales={recentSales} />
        </div>
        <div>
          <LowStockAlert products={lowStockProducts} />
        </div>
      </div>
    </div>
  )
}
