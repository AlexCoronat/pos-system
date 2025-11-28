/**
 * Sales Chart Widget
 */

'use client'

import { BarChart3 } from 'lucide-react'

interface SalesChartProps {
    data?: Array<{ date: string; sales: number }>
}

export function SalesChart({ data }: SalesChartProps) {
    const salesData = data && data.length > 0 ? data : []
    const maxSales = salesData.length > 0 ? Math.max(...salesData.map(d => d.sales)) : 0

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ventas de la Semana</h3>
                    <p className="text-sm text-gray-500">Últimos 7 días</p>
                </div>
                <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>

            {salesData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400">
                    <p>No hay datos disponibles</p>
                </div>
            ) : (
                <>
                    <div className="flex items-end justify-between gap-2 h-64">
                        {salesData.map((item, index) => {
                            const heightPercentage = maxSales > 0 ? (item.sales / maxSales) * 100 : 0

                            return (
                                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex flex-col items-center justify-end flex-1">
                                        <div className="text-xs font-medium text-gray-600 mb-1">
                                            ${(item.sales / 1000).toFixed(1)}k
                                        </div>
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400"
                                            style={{ height: `${heightPercentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{item.date}</span>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Total de la semana</span>
                            <span className="text-lg font-bold text-gray-900">
                                ${salesData.reduce((sum, item) => sum + item.sales, 0).toLocaleString('es-MX')}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
