'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  FileText,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  todaySales: number
  todayTransactions: number
  lowStockCount: number
  pendingQuotes: number
  percentageChange: {
    sales: number
    transactions: number
  }
}

interface SalesChartData {
  date: string
  sales: number
  transactions: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    lowStockCount: 0,
    pendingQuotes: 0,
    percentageChange: { sales: 0, transactions: 0 }
  })
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const locationId = user?.defaultLocationId || user?.assignedLocations?.[0]?.locationId

      // Build base query for today's sales - filter by location only if available
      let salesQuery = supabase
        .from('sales')
        .select('total_amount, id')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .is('deleted_at', null)

      if (locationId) {
        salesQuery = salesQuery.eq('location_id', locationId)
      }

      // Fetch today's sales
      const { data: todaySalesData, error: salesError } = await salesQuery

      if (salesError && salesError.code !== 'PGRST116') {
        console.error('Error fetching sales:', salesError)
      }

      const todayTotal = todaySalesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      const todayCount = todaySalesData?.length || 0

      // Fetch low stock products from inventory table
      let stockQuery = supabase
        .from('inventory')
        .select('id, quantity_available, reorder_point')

      if (locationId) {
        stockQuery = stockQuery.eq('location_id', locationId)
      }

      const { data: lowStockData, error: stockError } = await stockQuery

      if (stockError) {
        console.error('Error fetching low stock:', stockError)
      }

      const lowStockCount = lowStockData?.filter(item =>
        item.quantity_available <= (item.reorder_point || 0)
      ).length || 0

      // Fetch pending quotes count
      let quotesQuery = supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending')

      if (locationId) {
        quotesQuery = quotesQuery.eq('location_id', locationId)
      }

      const { count: quotesCount, error: quotesError } = await quotesQuery

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError)
      }

      // Fetch last 7 days sales data
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      let weekQuery = supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', sevenDaysAgo.toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (locationId) {
        weekQuery = weekQuery.eq('location_id', locationId)
      }

      const { data: weekSalesData, error: weekError } = await weekQuery

      if (weekError) {
        console.error('Error fetching week sales:', weekError)
      }

      // Aggregate sales by day
      const salesByDay = new Map<string, { sales: number, count: number }>()
      weekSalesData?.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0]
        const current = salesByDay.get(date) || { sales: 0, count: 0 }
        salesByDay.set(date, {
          sales: current.sales + (sale.total_amount || 0),
          count: current.count + 1
        })
      })

      const aggregatedSales = Array.from(salesByDay.entries()).map(([date, data]) => ({
        sale_date: date,
        total_sales: data.sales,
        total_transactions: data.count
      }))

      // Fetch top selling products from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      let recentSalesQuery = supabase
        .from('sales')
        .select('id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .is('deleted_at', null)

      if (locationId) {
        recentSalesQuery = recentSalesQuery.eq('location_id', locationId)
      }

      const { data: recentSales } = await recentSalesQuery

      const saleIds = recentSales?.map(s => s.id) || []

      let topProductsData: any[] = []
      if (saleIds.length > 0) {
        const { data, error: topProductsError } = await supabase
          .from('sale_items')
          .select(`
            product_id,
            quantity,
            line_total,
            product:products!product_id(name)
          `)
          .in('sale_id', saleIds)

        if (topProductsError) {
          console.error('Error fetching top products:', topProductsError)
        } else {
          topProductsData = data || []
        }
      }

      // Calculate percentage changes (compare with yesterday)
      let salesChange = 0
      let transactionsChange = 0
      if (aggregatedSales && aggregatedSales.length >= 2) {
        const todayData = aggregatedSales[aggregatedSales.length - 1]
        const yesterdayData = aggregatedSales[aggregatedSales.length - 2]

        if (yesterdayData.total_sales > 0) {
          salesChange = ((todayData.total_sales - yesterdayData.total_sales) / yesterdayData.total_sales) * 100
        }
        if (yesterdayData.total_transactions > 0) {
          transactionsChange = ((todayData.total_transactions - yesterdayData.total_transactions) / yesterdayData.total_transactions) * 100
        }
      }

      setStats({
        todaySales: todayTotal,
        todayTransactions: todayCount,
        lowStockCount: lowStockCount,
        pendingQuotes: quotesCount || 0,
        percentageChange: {
          sales: Math.round(salesChange * 10) / 10,
          transactions: Math.round(transactionsChange * 10) / 10
        }
      })

      // Format chart data
      if (aggregatedSales) {
        setSalesChartData(aggregatedSales.map(item => ({
          date: new Date(item.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: item.total_sales,
          transactions: item.total_transactions
        })))
      }

      // Aggregate top products
      if (topProductsData) {
        const productMap = new Map<number, { name: string, quantity: number, revenue: number }>()
        topProductsData.forEach((item: any) => {
          const productName = item.product?.[0]?.name || 'Unknown'
          const current = productMap.get(item.product_id) || { name: productName, quantity: 0, revenue: 0 }
          productMap.set(item.product_id, {
            name: productName,
            quantity: current.quantity + (item.quantity || 0),
            revenue: current.revenue + (item.line_total || 0)
          })
        })

        const aggregatedProducts = Array.from(productMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)

        setTopProducts(aggregatedProducts)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('greeting.morning')
    if (hour < 18) return t('greeting.afternoon')
    return t('greeting.evening')
  }

  const dashboardStats = [
    {
      title: t('stats.todaySales'),
      value: formatCurrency(stats.todaySales),
      change: `${stats.percentageChange.sales > 0 ? '+' : ''}${stats.percentageChange.sales}%`,
      icon: DollarSign,
      color: stats.percentageChange.sales >= 0 ? "text-green-600" : "text-red-600",
      bgColor: "bg-green-100",
      trending: stats.percentageChange.sales >= 0
    },
    {
      title: t('stats.transactions'),
      value: stats.todayTransactions.toString(),
      change: `${stats.percentageChange.transactions > 0 ? '+' : ''}${stats.percentageChange.transactions}%`,
      icon: ShoppingCart,
      color: stats.percentageChange.transactions >= 0 ? "text-green-600" : "text-red-600",
      bgColor: "bg-blue-100",
      trending: stats.percentageChange.transactions >= 0
    },
    {
      title: t('stats.lowStockItems'),
      value: stats.lowStockCount.toString(),
      change: t('stats.needsAttention'),
      icon: Package,
      color: stats.lowStockCount > 0 ? "text-orange-600" : "text-green-600",
      bgColor: "bg-orange-100",
      trending: false
    },
    {
      title: t('stats.pendingQuotes'),
      value: stats.pendingQuotes.toString(),
      change: t('stats.awaitingAction'),
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      trending: false
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {user?.firstName}!
        </h2>
        <p className="text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon
          const TrendIcon = stat.trending ? ArrowUpRight : ArrowDownRight
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      {stat.value}
                    </p>
                    <div className="flex items-center">
                      {index < 2 && (
                        <TrendIcon className={`h-4 w-4 mr-1 ${stat.color}`} />
                      )}
                      <p className={`text-sm font-medium ${stat.color}`}>
                        {stat.change}
                      </p>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.bgColor}`}>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              {t('charts.salesOverview')}
            </CardTitle>
            <CardDescription>
              {t('charts.dailyPerformance')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name={t('charts.sales')}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-purple-600" />
              {t('charts.topProducts')}
            </CardTitle>
            <CardDescription>
              {t('charts.bestPerformers')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="quantity" fill="#8b5cf6" name={t('charts.quantitySold')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {stats.lowStockCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              {t('alerts.inventoryAlerts')}
            </CardTitle>
            <CardDescription>
              {t('alerts.itemsAttention')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {t('alerts.lowStockAlert')}
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {t('alerts.lowStockMessage', { count: stats.lowStockCount })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
