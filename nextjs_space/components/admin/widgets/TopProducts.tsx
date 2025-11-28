/**
 * Top Products Widget
 */

'use client'

import { TrendingUp } from 'lucide-react'

interface Product {
    id: number
    name: string
    sales: number
    revenue: number
}

interface TopProductsProps {
    products?: Product[]
}

export function TopProducts({ products }: TopProductsProps) {
    const topProducts = products && products.length > 0 ? products : []
    const maxSales = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.sales)) : 0

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Top Productos</h3>
            </div>

            {topProducts.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                    <p>No hay datos disponibles</p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {topProducts.map((product, index) => {
                            const percentage = maxSales > 0 ? (product.sales / maxSales) * 100 : 0

                            return (
                                <div key={product.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                                                <p className="text-xs text-gray-500">{product.sales} unidades</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">
                                            ${product.revenue.toLocaleString('es-MX')}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Total vendido</span>
                            <span className="font-bold text-gray-900">
                                {topProducts.reduce((sum, p) => sum + p.sales, 0)} unidades
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
