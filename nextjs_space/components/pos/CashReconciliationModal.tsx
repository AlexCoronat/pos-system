/**
 * Cash Reconciliation Modal
 * Detailed cash counting by denomination for cash register reconciliation
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Calculator, Printer, Check, AlertTriangle } from 'lucide-react'
import { useShiftStore } from '@/lib/stores/shift-store'
import { shiftService, type Shift } from '@/lib/services/shift.service'
import { toast } from 'sonner'
import { useEscapeKey } from '@/lib/hooks/use-keyboard-shortcuts'
import { BrandButton } from '@/components/shared'

interface CashReconciliationModalProps {
    isOpen: boolean
    onClose: () => void
}

// Mexican currency denominations
const DENOMINATIONS = {
    bills: [
        { value: 1000, label: '$1,000' },
        { value: 500, label: '$500' },
        { value: 200, label: '$200' },
        { value: 100, label: '$100' },
        { value: 50, label: '$50' },
        { value: 20, label: '$20' },
    ],
    coins: [
        { value: 20, label: '$20' },
        { value: 10, label: '$10' },
        { value: 5, label: '$5' },
        { value: 2, label: '$2' },
        { value: 1, label: '$1' },
        { value: 0.5, label: '$0.50' },
    ]
}

type DenominationCounts = Record<string, number>

export function CashReconciliationModal({ isOpen, onClose }: CashReconciliationModalProps) {
    const { currentShift } = useShiftStore()
    const [shiftSummary, setShiftSummary] = useState<Shift | null>(null)
    const [isLoadingSummary, setIsLoadingSummary] = useState(false)
    const [billCounts, setBillCounts] = useState<DenominationCounts>({})
    const [coinCounts, setCoinCounts] = useState<DenominationCounts>({})
    const [notes, setNotes] = useState('')

    useEscapeKey(() => {
        if (isOpen) {
            onClose()
        }
    }, isOpen)

    useEffect(() => {
        if (isOpen && currentShift) {
            loadShiftSummary()
            // Reset counts
            setBillCounts({})
            setCoinCounts({})
            setNotes('')
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

    // Calculate totals
    const billsTotal = useMemo(() => {
        return DENOMINATIONS.bills.reduce((sum, denom) => {
            return sum + (denom.value * (billCounts[denom.value.toString()] || 0))
        }, 0)
    }, [billCounts])

    const coinsTotal = useMemo(() => {
        return DENOMINATIONS.coins.reduce((sum, denom) => {
            return sum + (denom.value * (coinCounts[denom.value.toString()] || 0))
        }, 0)
    }, [coinCounts])

    const totalCounted = billsTotal + coinsTotal
    const expectedAmount = (shiftSummary?.opening_amount || 0) + (shiftSummary?.summary?.cash_sales || 0)
    const difference = totalCounted - expectedAmount
    const hasDifference = Math.abs(difference) > 0.01

    const handleBillCountChange = (value: number, count: string) => {
        const numCount = parseInt(count) || 0
        setBillCounts(prev => ({ ...prev, [value.toString()]: numCount }))
    }

    const handleCoinCountChange = (value: number, count: string) => {
        const numCount = parseInt(count) || 0
        setCoinCounts(prev => ({ ...prev, [value.toString()]: numCount }))
    }

    const handleClearAll = () => {
        setBillCounts({})
        setCoinCounts({})
    }

    const handlePrint = () => {
        // TODO: Implement print functionality
        toast.info('Función de impresión en desarrollo')
    }

    const handleSaveReconciliation = () => {
        // For now, just show the result - this is a mid-shift count, not closing
        toast.success(`Arqueo guardado: $${totalCounted.toFixed(2)}`)
        onClose()
    }

    if (!isOpen || !currentShift) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-blue-600" />
                            Arqueo de Caja
                        </h2>
                        <p className="text-sm text-gray-600">{currentShift.shift_number}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Shift Summary */}
                    {isLoadingSummary ? (
                        <div className="bg-gray-100 rounded-lg p-6 animate-pulse">
                            <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
                            <div className="h-6 bg-gray-300 rounded w-32"></div>
                        </div>
                    ) : shiftSummary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-gray-600">Monto Inicial</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        ${shiftSummary.opening_amount.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Ventas Efectivo</p>
                                    <p className="text-lg font-bold text-green-600">
                                        ${(shiftSummary.summary?.cash_sales || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Efectivo Esperado</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        ${expectedAmount.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Total Ventas</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        ${(shiftSummary.summary?.total_sales || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Denomination Counting */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bills */}
                        <div className="bg-green-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                Billetes
                            </h3>
                            <div className="space-y-3">
                                {DENOMINATIONS.bills.map((denom) => (
                                    <div key={`bill-${denom.value}`} className="flex items-center gap-3">
                                        <span className="w-16 text-sm font-medium text-gray-700">
                                            {denom.label}
                                        </span>
                                        <span className="text-gray-400">×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={billCounts[denom.value.toString()] || ''}
                                            onChange={(e) => handleBillCountChange(denom.value, e.target.value)}
                                            placeholder="0"
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <span className="text-gray-400">=</span>
                                        <span className="w-24 text-right font-medium text-gray-900">
                                            ${(denom.value * (billCounts[denom.value.toString()] || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-green-200 flex justify-between">
                                    <span className="font-semibold text-gray-900">Subtotal Billetes:</span>
                                    <span className="font-bold text-green-700">${billsTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Coins */}
                        <div className="bg-amber-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                                Monedas
                            </h3>
                            <div className="space-y-3">
                                {DENOMINATIONS.coins.map((denom) => (
                                    <div key={`coin-${denom.value}`} className="flex items-center gap-3">
                                        <span className="w-16 text-sm font-medium text-gray-700">
                                            {denom.label}
                                        </span>
                                        <span className="text-gray-400">×</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={coinCounts[denom.value.toString()] || ''}
                                            onChange={(e) => handleCoinCountChange(denom.value, e.target.value)}
                                            placeholder="0"
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <span className="text-gray-400">=</span>
                                        <span className="w-24 text-right font-medium text-gray-900">
                                            ${(denom.value * (coinCounts[denom.value.toString()] || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-amber-200 flex justify-between">
                                    <span className="font-semibold text-gray-900">Subtotal Monedas:</span>
                                    <span className="font-bold text-amber-700">${coinsTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total and Difference */}
                    <div className="bg-gray-100 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center text-lg">
                            <span className="font-semibold text-gray-900">Total Contado:</span>
                            <span className="text-2xl font-bold text-gray-900">${totalCounted.toFixed(2)}</span>
                        </div>

                        {totalCounted > 0 && (
                            <div className={`flex justify-between items-center p-3 rounded-lg ${!hasDifference
                                    ? 'bg-green-100 text-green-800'
                                    : difference > 0
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                <span className="font-medium flex items-center gap-2">
                                    {!hasDifference ? (
                                        <><Check className="w-5 h-5" /> Cuadre Perfecto</>
                                    ) : difference > 0 ? (
                                        <><AlertTriangle className="w-5 h-5" /> Sobrante</>
                                    ) : (
                                        <><AlertTriangle className="w-5 h-5" /> Faltante</>
                                    )}
                                </span>
                                <span className="font-bold">
                                    {hasDifference ? `${difference > 0 ? '+' : ''}$${difference.toFixed(2)}` : '$0.00'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Notas del Arqueo
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observaciones sobre el conteo..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Limpiar Todo
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <div className="flex-1"></div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <BrandButton
                            onClick={handleSaveReconciliation}
                            className="px-6 flex items-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            Guardar Arqueo
                        </BrandButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
