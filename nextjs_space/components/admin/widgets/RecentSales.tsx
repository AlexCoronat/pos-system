/**
 * Recent Sales Widget
 */

'use client'

import { Clock, Eye } from 'lucide-react'
import Link from 'next/link'

interface Sale {
    id: number
    customerName: string
    date: string
    amount: number
    status: 'completed' | 'pending' | 'cancelled'
}

interface RecentSalesProps {
    sales?: Sale[]
}

export function RecentSales({ sales }: RecentSalesProps) {
    const recentSales = sales && sales.length > 0 ? sales : []

    const statusColors = {
        completed: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-yellow-100 text-yellow-700',
        cancelled: 'bg-red-100 text-red-700'
    }

    const statusLabels = {
        completed: 'Completada',
        pending: 'Pendiente',
        cancelled: 'Cancelada'
    }

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Ventas Recientes</h3>
                </div>
            </div>

            {recentSales.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                    <p>No hay ventas recientes</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">ID</th>
                                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSales.map((sale) => (
                                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-2 text-sm text-gray-600">#{sale.id}</td>
                                    <td className="py-3 px-2 text-sm font-medium text-gray-900">{sale.customerName}</td>
                                    <td className="py-3 px-2 text-sm text-gray-500">{sale.date}</td>
                                    <td className="py-3 px-2 text-sm font-semibold text-gray-900">
                                        ${sale.amount.toLocaleString('es-MX')}
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[sale.status]}`}>
                                            {statusLabels[sale.status]}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
