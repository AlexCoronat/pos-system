'use client'

import { useState, useEffect } from 'react'
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

      if (!locationId) {
        console.warn('No location assigned to user')
        setLoading(false)
        return
      }

      // Fetch today's sales from materialized view
      const { data: todaySalesData, error: salesError } = await supabase
        .from('pos_core.mv_daily_sales_by_location')
        .select('total_sales, total_transactions')
        .eq('sale_date', today)
        .eq('location_id', locationId)
        .single()

      if (salesError && salesError.code !== 'PGRST116') {
        console.error('Error fetching sales:', salesError)
      }

      // Fetch low stock products
      const { data: lowStockData, error: stockError } = await supabase
        .from('pos_core.products')
        .select('id')
        .eq('location_id', locationId)
        .eq('deleted_at', null)
        .filter('stock_quantity', 'lte', 'reorder_level')

      if (stockError) {
        console.error('Error fetching low stock:', stockError)
      }

      // Fetch pending quotes count
      const { count: quotesCount, error: quotesError } = await supabase
        .from('pos_core.quotes')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'Pending')

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError)
      }

      // Fetch last 7 days sales data
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: weekSalesData, error: weekError } = await supabase
        .from('pos_core.mv_daily_sales_by_location')
        .select('sale_date, total_sales, total_transactions')
        .eq('location_id', locationId)
        .gte('sale_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('sale_date', { ascending: true })

      if (weekError) {
        console.error('Error fetching week sales:', weekError)
      }

      // Fetch top selling products
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('pos_core.mv_top_selling_products')
        .select('product_name, total_quantity_sold, total_revenue')
        .eq('location_id', locationId)
        .order('total_quantity_sold', { ascending: false })
        .limit(5)

      if (topProductsError) {
        console.error('Error fetching top products:', topProductsError)
      }

      // Calculate percentage changes (compare with yesterday)
      let salesChange = 0
      let transactionsChange = 0
      if (weekSalesData && weekSalesData.length >= 2) {
        const todayData = weekSalesData[weekSalesData.length - 1]
        const yesterdayData = weekSalesData[weekSalesData.length - 2]

        if (yesterdayData.total_sales > 0) {
          salesChange = ((todayData.total_sales - yesterdayData.total_sales) / yesterdayData.total_sales) * 100
        }
        if (yesterdayData.total_transactions > 0) {
          transactionsChange = ((todayData.total_transactions - yesterdayData.total_transactions) / yesterdayData.total_transactions) * 100
        }
      }

      setStats({
        todaySales: todaySalesData?.total_sales || 0,
        todayTransactions: todaySalesData?.total_transactions || 0,
        lowStockCount: lowStockData?.length || 0,
        pendingQuotes: quotesCount || 0,
        percentageChange: {
          sales: Math.round(salesChange * 10) / 10,
          transactions: Math.round(transactionsChange * 10) / 10
        }
      })

      // Format chart data
      if (weekSalesData) {
        setSalesChartData(weekSalesData.map(item => ({
          date: new Date(item.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: item.total_sales,
          transactions: item.total_transactions
        })))
      }

      // Format top products
      if (topProductsData) {
        setTopProducts(topProductsData.map(item => ({
          name: item.product_name,
          quantity: item.total_quantity_sold,
          revenue: item.total_revenue
        })))
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

  const dashboardStats = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      change: `${stats.percentageChange.sales > 0 ? '+' : ''}${stats.percentageChange.sales}%`,
      icon: DollarSign,
      color: stats.percentageChange.sales >= 0 ? "text-green-600" : "text-red-600",
      bgColor: "bg-green-100",
      trending: stats.percentageChange.sales >= 0
    },
    {
      title: "Transactions",
      value: stats.todayTransactions.toString(),
      change: `${stats.percentageChange.transactions > 0 ? '+' : ''}${stats.percentageChange.transactions}%`,
      icon: ShoppingCart,
      color: stats.percentageChange.transactions >= 0 ? "text-green-600" : "text-red-600",
      bgColor: "bg-blue-100",
      trending: stats.percentageChange.transactions >= 0
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockCount.toString(),
      change: "Needs attention",
      icon: Package,
      color: stats.lowStockCount > 0 ? "text-orange-600" : "text-green-600",
      bgColor: "bg-orange-100",
      trending: false
    },
    {
      title: "Pending Quotes",
      value: stats.pendingQuotes.toString(),
      change: "Awaiting action",
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
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}!
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your store today.
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
                Sales Overview (Last 7 Days)
              </CardTitle>
              <CardDescription>
                Daily sales performance
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
                    name="Sales"
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
                Top Selling Products
              </CardTitle>
              <CardDescription>
                Best performers this period
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
                  <Bar dataKey="quantity" fill="#8b5cf6" name="Quantity Sold" />
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
                Inventory Alerts
              </CardTitle>
              <CardDescription>
                Items requiring your attention
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
                      Low Stock Alert
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        You have {stats.lowStockCount} product(s) with stock below reorder level.
                        Please review your inventory and place orders to avoid stockouts.
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
