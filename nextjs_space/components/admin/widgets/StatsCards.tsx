/**
 * Stats Cards Widget
 */

'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package } from 'lucide-react'

interface StatsCardsProps {
    stats?: {
        totalSales?: number
        totalOrders?: number
        totalCustomers?: number
        lowStockItems?: number
        salesChange?: number
        ordersChange?: number
    }
}

export function StatsCards({ stats }: StatsCardsProps) {
    const cards = [
        {
            title: 'Ventas Hoy',
            value: `$${(stats?.totalSales || 0).toLocaleString('es-MX')}`,
            change: stats?.salesChange || 0,
            icon: DollarSign,
            color: 'blue'
        },
        {
            title: 'Pedidos Hoy',
            value: (stats?.totalOrders || 0).toString(),
            change: stats?.ordersChange || 0,
            icon: ShoppingBag,
            color: 'emerald'
        },
        {
            title: 'Clientes',
            value: (stats?.totalCustomers || 0).toString(),
            change: 0,
            icon: Users,
            color: 'violet'
        },
        {
            title: 'Stock Bajo',
            value: (stats?.lowStockItems || 0).toString(),
            change: 0,
            icon: Package,
            color: 'orange'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card) => {
                const Icon = card.icon
                const isPositive = card.change >= 0

                return (
                    <div key={card.title} className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 bg-${card.color}-100 rounded-lg flex items-center justify-center`}>
                                <Icon className={`w-6 h-6 text-${card.color}-600`} />
                            </div>
                            {card.change !== 0 && (
                                <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    <span>{Math.abs(card.change)}%</span>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                )
            })}
        </div>
    )
}
