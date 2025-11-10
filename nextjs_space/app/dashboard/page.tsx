
'use client'

import { useRequireAuth } from '@/lib/auth/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Settings,
  LogOut,
  Store,
  Calendar,
  Clock
} from 'lucide-react'

export default function DashboardPage() {
  const { user, logout, hasPermission, loading } = useRequireAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return null // Middleware will redirect to login
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Mock data - replace with real data from your POS system
  const dashboardStats = [
    {
      title: "Today's Sales",
      value: "$2,350.00",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Total Orders",
      value: "47",
      change: "+8.2%",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Active Products",
      value: "1,234",
      change: "+2.1%",
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Customers",
      value: "892",
      change: "+15.3%",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  const recentActivities = [
    { action: "Sale completed", amount: "$125.50", time: "2 minutes ago", type: "sale" },
    { action: "Product added", item: "Notebook A4", time: "5 minutes ago", type: "inventory" },
    { action: "Customer registered", customer: "John Doe", time: "10 minutes ago", type: "customer" },
    { action: "Payment processed", amount: "$89.99", time: "15 minutes ago", type: "payment" }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Store className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">POS System</h1>
              </div>
              <div className="hidden md:block text-sm text-gray-500">
                {user.locationName && (
                  <span className="flex items-center">
                    <Store className="h-4 w-4 mr-1" />
                    {user.locationName}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, <strong>{user.firstName} {user.lastName}</strong>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.roleName}
              </span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.firstName}!
          </h2>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                      <p className={`text-sm font-medium ${stat.color}`}>
                        {stat.change} from yesterday
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { 
                    name: "New Sale", 
                    icon: ShoppingCart, 
                    color: "bg-green-500 hover:bg-green-600",
                    permission: "sales:create"
                  },
                  { 
                    name: "Add Product", 
                    icon: Package, 
                    color: "bg-blue-500 hover:bg-blue-600",
                    permission: "inventory:create"
                  },
                  { 
                    name: "Reports", 
                    icon: BarChart3, 
                    color: "bg-purple-500 hover:bg-purple-600",
                    permission: "reports:read"
                  },
                  { 
                    name: "Settings", 
                    icon: Settings, 
                    color: "bg-gray-500 hover:bg-gray-600",
                    permission: "settings:read"
                  },
                ].map((action, index) => (
                  <Button
                    key={index}
                    className={`h-20 flex flex-col items-center justify-center text-white ${action.color} transition-colors duration-200`}
                    disabled={!hasPermission(action.permission)}
                  >
                    <action.icon className="h-6 w-6 mb-2" />
                    <span className="text-sm">{action.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest transactions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      {activity.amount && (
                        <p className="text-sm text-green-600 font-semibold">
                          {activity.amount}
                        </p>
                      )}
                      {activity.item && (
                        <p className="text-sm text-gray-600">
                          {activity.item}
                        </p>
                      )}
                      {activity.customer && (
                        <p className="text-sm text-gray-600">
                          {activity.customer}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              System Status & Alerts
            </CardTitle>
            <CardDescription>
              Important notifications and system information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Welcome to your POS System!
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This is your main dashboard where you can monitor sales, manage inventory, 
                      and access all system features. Your role ({user.roleName}) gives you 
                      access to the following permissions:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(user.permissions).map(([module, actions]) => (
                        <li key={module} className="text-xs">
                          <strong>{module}:</strong> {actions.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
