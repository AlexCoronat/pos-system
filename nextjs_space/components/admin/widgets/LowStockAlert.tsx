/**
 * Low Stock Alert Widget
 */

'use client'

import { AlertTriangle, Package } from 'lucide-react'
import Link from 'next/link'

interface LowStockProduct {
    id: number
    name: string
    currentStock: number
    minStock: number
    category: string
}

interface LowStockAlertProps {
    products?: LowStockProduct[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
    const lowStockProducts = products && products.length > 0 ? products : []

    const getStockLevel = (current: number, min: number) => {
        const percentage = min > 0 ? (current / min) * 100 : 0
        if (percentage <= 20) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Crítico' }
        if (percentage <= 50) return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Bajo' }
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Atención' }
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Alertas de Inventario</h3>
                </div>
                <Link href="/dashboard/inventory" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Ver inventario
                </Link>
            </div>

            {lowStockProducts.length === 0 ? (
                <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay productos con stock bajo</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {lowStockProducts.map((product) => {
                            const stockLevel = getStockLevel(product.currentStock, product.minStock)

                            return (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stockLevel.bg} ${stockLevel.color}`}>
                                                {stockLevel.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">{product.category}</p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {product.currentStock} / {product.minStock}
                                        </p>
                                        <p className="text-xs text-gray-500">unidades</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <Link
                            href="/dashboard/inventory/restock"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium text-sm"
                        >
                            <Package className="w-4 h-4" />
                            Gestionar Reabastecimiento
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}
