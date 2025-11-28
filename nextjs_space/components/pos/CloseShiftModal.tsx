/**
 * Close Shift Modal
 * Form to close current shift with cash counting
 */

'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, TrendingUp, Loader2, AlertTriangle } from 'lucide-react'
import { useShiftStore } from '@/lib/stores/shift-store'
import { shiftService, type Shift } from '@/lib/services/shift.service'
import { toast } from 'sonner'

interface CloseShiftModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (shiftId: number) => void
}

export function CloseShiftModal({ isOpen, onClose, onSuccess }: CloseShiftModalProps) {
    const { currentShift, closeShift, isLoading: shiftLoading } = useShiftStore()
    const [shiftSummary, setShiftSummary] = useState<Shift | null>(null)
    const [actualAmount, setActualAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [isLoadingSummary, setIsLoadingSummary] = useState(false)

    useEffect(() => {
        if (isOpen && currentShift) {
            loadShiftSummary()
        }
    }, [isOpen, currentShift])

    const loadShiftSummary = async () => {
        if (!currentShift) return

        setIsLoadingSummary(true)
        try {
            const summary = await shiftService.getShiftSummary(currentShift.id)
            setShiftSummary(summary)
        } catch (error) {
            console.error('Error loading shift summary:', error)
            toast.error('Error al cargar resumen del turno')
        } finally {
            setIsLoadingSummary(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const amount = parseFloat(actualAmount)
        if (isNaN(amount) || amount < 0) {
            toast.error('El monto contado debe ser válido')
            return
        }

        try {
            if (!currentShift) {
                toast.error('No hay turno activo')
                return
            }

            await closeShift({
                actual_amount: amount,
                closing_notes: notes || undefined
            })

            toast.success('Turno cerrado exitosamente')
            onSuccess(currentShift.id)
            handleClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al cerrar turno')
        }
    }

    const handleClose = () => {
        setActualAmount('')
        setNotes('')
        setShiftSummary(null)
        onClose()
    }

    if (!isOpen || !currentShift) return null

    const expectedCashAmount = (shiftSummary?.opening_amount || 0) + (shiftSummary?.summary?.cash_sales || 0)
    const countedAmount = parseFloat(actualAmount) || 0
    const difference = countedAmount - expectedCashAmount
    const hasDifference = Math.abs(difference) > 0.01

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Cerrar Turno</h2>
                        <p className="text-sm text-gray-600">{currentShift.shift_number}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={shiftLoading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Shift Summary */}
                    {isLoadingSummary ? (
                        <div className="bg-gray-100 rounded-lg p-6 animate-pulse space-y-3">
                            <div className="h-4 bg-gray-300 rounded w-32"></div>
                            <div className="h-4 bg-gray-300 rounded w-48"></div>
                        </div>
                    ) : shiftSummary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                Resumen del Turno
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600">Total Ventas</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ${(shiftSummary.summary.total_sales || 0).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {shiftSummary.summary.sales_count || 0} transacciones
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-600">Ventas en Efectivo</p>
                                    <p className="text-xl font-bold text-green-600">
                                        ${(shiftSummary.summary.cash_sales || 0).toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-600">Monto Inicial</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        ${shiftSummary.opening_amount.toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-600">Efectivo Esperado</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        ${expectedCashAmount.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cash Count */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Monto Contado en Caja *
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                                $
                            </span>
                            <input
                                type="number"
                                value={actualAmount}
                                onChange={(e) => setActualAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                                disabled={shiftLoading}
                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Cuenta todo el efectivo disponible en la caja
                        </p>
                    </div>

                    {/* Difference Warning */}
                    {hasDifference && actualAmount && (
                        <div className={`${difference > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4 flex items-start gap-2`}>
                            <AlertTriangle className={`w-5 h-5 ${difference > 0 ? 'text-yellow-600' : 'text-red-600'} flex-shrink-0 mt-0.5`} />
                            <div>
                                <p className={`font-semibold ${difference > 0 ? 'text-yellow-900' : 'text-red-900'}`}>
                                    {difference > 0 ? 'Sobrante' : 'Faltante'} de Efectivo
                                </p>
                                <p className={`text-sm ${difference > 0 ? 'text-yellow-800' : 'text-red-800'}`}>
                                    Diferencia: <span className="font-bold">${Math.abs(difference).toFixed(2)}</span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Por favor verifica el conteo y agrega una nota explicativa
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success Indicator */}
                    {!hasDifference && actualAmount && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            <p className="text-green-900 font-semibold">
                                Cuadre perfecto - Sin diferencias
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Notas de Cierre {hasDifference && <span className="text-red-600">*</span>}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observaciones al cerrar el turno..."
                            rows={4}
                            required={hasDifference}
                            disabled={shiftLoading}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        {hasDifference && (
                            <p className="text-xs text-red-600 mt-1">
                                Obligatorio explicar la diferencia en el conteo
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={shiftLoading}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={shiftLoading || !actualAmount}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {shiftLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Cerrando...
                                </>
                            ) : (
                                <>
                                    <DollarSign className="w-5 h-5" />
                                    Cerrar Turno
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
