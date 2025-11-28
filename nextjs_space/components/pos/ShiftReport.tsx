/**
 * Shift Report Component
 * Printable/exportable shift report
 */

'use client'

import { useEffect, useState } from 'react'
import { X, Printer, Download, Calendar, User, DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react'
import { shiftService, type Shift } from '@/lib/services/shift.service'
import { cashMovementService, type CashMovement } from '@/lib/services/cash-movement.service'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ShiftReportProps {
    isOpen: boolean
    onClose: () => void
    shiftId: number
}

export function ShiftReport({ isOpen, onClose, shiftId }: ShiftReportProps) {
    const [shift, setShift] = useState<Shift | null>(null)
    const [movements, setMovements] = useState<CashMovement[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (isOpen && shiftId) {
            loadShiftData()
        }
    }, [isOpen, shiftId])

    const loadShiftData = async () => {
        setIsLoading(true)
        try {
            const [shiftData, movementsData] = await Promise.all([
                shiftService.getShiftSummary(shiftId),
                cashMovementService.getShiftMovements(shiftId)
            ])
            setShift(shiftData)
            setMovements(movementsData)
        } catch (error) {
            console.error('Error loading shift data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExportPDF = () => {
        // TODO: Implement PDF export using jsPDF or similar
        window.print()
    }

    if (!isOpen) return null

    if (isLoading || !shift) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Cargando reporte...</p>
                </div>
            </div>
        )
    }

    const cashMovements = movements.filter(m => ['deposit', 'withdrawal'].includes(m.movement_type))
    const totalDeposits = cashMovements
        .filter(m => m.movement_type === 'deposit')
        .reduce((sum, m) => sum + Number(m.amount), 0)
    const totalWithdrawals = cashMovements
        .filter(m => m.movement_type === 'withdrawal')
        .reduce((sum, m) => sum + Number(m.amount), 0)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none">
                {/* Header - Hidden when printing */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-900">Reporte de Turno</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="p-8 space-y-8">
                    {/* Business Header */}
                    <div className="text-center border-b pb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reporte de Turno</h1>
                        <p className="text-gray-600">{shift.cash_register?.name || 'Caja No Especificada'}</p>
                    </div>

                    {/* Shift Information */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del Turno</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Número de Turno:</span>
                                    <span className="font-semibold">{shift.shift_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Estado:</span>
                                    <span className={`font-semibold ${shift.status === 'closed' ? 'text-green-600' : 'text-blue-600'
                                        }`}>
                                        {shift.status === 'closed' ? 'Cerrado' : 'Abierto'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Cajero:</span>
                                    <span className="font-semibold">
                                        {shift.user ? `${shift.user.first_name} ${shift.user.last_name}` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Horario</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Apertura:</span>
                                    <span className="font-semibold">
                                        {format(new Date(shift.opened_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                    </span>
                                </div>
                                {shift.closed_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Cierre:</span>
                                        <span className="font-semibold">
                                            {format(new Date(shift.closed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cash Summary */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen de Efectivo</h3>
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 space-y-3">
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-700">Monto Inicial:</span>
                                <span className="font-bold">${shift.opening_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-700">Ventas en Efectivo:</span>
                                <span className="font-bold text-green-600">
                                    +${(shift.summary.cash_sales || 0).toFixed(2)}
                                </span>
                            </div>
                            {totalDeposits > 0 && (
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-700">Depósitos:</span>
                                    <span className="font-bold text-green-600">+${totalDeposits.toFixed(2)}</span>
                                </div>
                            )}
                            {totalWithdrawals > 0 && (
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-700">Retiros:</span>
                                    <span className="font-bold text-red-600">-${totalWithdrawals.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t border-blue-300 pt-3 mt-3">
                                <div className="flex justify-between text-xl">
                                    <span className="font-bold text-gray-900">Efectivo Esperado:</span>
                                    <span className="font-bold text-blue-600">
                                        ${(shift.expected_amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            {shift.status === 'closed' && shift.actual_amount !== null && (
                                <>
                                    <div className="flex justify-between text-xl">
                                        <span className="font-bold text-gray-900">Efectivo Contado:</span>
                                        <span className="font-bold">${shift.actual_amount.toFixed(2)}</span>
                                    </div>
                                    {shift.difference !== null && Math.abs(shift.difference) > 0.01 && (
                                        <div className="flex justify-between text-xl">
                                            <span className="font-bold text-gray-900">Diferencia:</span>
                                            <span className={`font-bold ${shift.difference > 0 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                {shift.difference > 0 ? '+' : ''}${shift.difference.toFixed(2)}
                                                {shift.difference > 0 ? ' (Sobrante)' : ' (Faltante)'}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sales Summary */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen de Ventas</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600">Total Ventas</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {shift.summary.sales_count || 0}
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600">Monto Total</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${(shift.summary.total_sales || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-sm text-green-700">Efectivo</p>
                                <p className="text-xl font-bold text-green-700">
                                    ${(shift.summary.cash_sales || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-sm text-blue-700">Tarjeta</p>
                                <p className="text-xl font-bold text-blue-700">
                                    ${(shift.summary.card_sales || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cash Movements */}
                    {cashMovements.length > 0 && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Movimientos de Efectivo</h3>
                            <div className="space-y-2">
                                {cashMovements.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            {movement.movement_type === 'deposit' ? (
                                                <TrendingUp className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <TrendingDown className="w-5 h-5 text-red-600" />
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900">{movement.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`font-bold ${movement.movement_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {movement.movement_type === 'deposit' ? '+' : '-'}${Number(movement.amount).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {(shift.opening_notes || shift.closing_notes) && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Notas</h3>
                            {shift.opening_notes && (
                                <div className="mb-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-1">Apertura:</p>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded">{shift.opening_notes}</p>
                                </div>
                            )}
                            {shift.closing_notes && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 mb-1">Cierre:</p>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded">{shift.closing_notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t pt-6 text-center text-sm text-gray-500">
                        <p>Reporte generado el {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
