/**
 * Open Shift Modal
 * Form to start a new shift
 */

'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, AlertCircle } from 'lucide-react'
import { useShiftStore } from '@/lib/stores/shift-store'
import { cashRegisterService, type CashRegister } from '@/lib/services/cash-register.service'
import { toast } from 'sonner'
import { useEscapeKey } from '@/lib/hooks/use-keyboard-shortcuts'

interface OpenShiftModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function OpenShiftModal({ isOpen, onClose, onSuccess }: OpenShiftModalProps) {
    const { openShift, isLoading: shiftLoading } = useShiftStore()
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
    const [selectedRegister, setSelectedRegister] = useState<number | null>(null)
    const [openingAmount, setOpeningAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [isLoadingRegisters, setIsLoadingRegisters] = useState(true)

    // ESC to close modal
    useEscapeKey(() => {
        if (isOpen && !shiftLoading) {
            handleClose()
        }
    }, isOpen && !shiftLoading)

    useEffect(() => {
        if (isOpen) {
            loadCashRegisters()
        }
    }, [isOpen])

    const loadCashRegisters = async () => {
        setIsLoadingRegisters(true)
        const registers = await cashRegisterService.getCashRegisters()
        const activeRegisters = registers.filter(r => r.is_active)
        setCashRegisters(activeRegisters)

        // Auto-select if only one register
        if (activeRegisters.length === 1) {
            setSelectedRegister(activeRegisters[0].id)
        }

        setIsLoadingRegisters(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedRegister) {
            toast.error('Selecciona una caja registradora')
            return
        }

        const amount = parseFloat(openingAmount)
        if (isNaN(amount) || amount < 0) {
            toast.error('El monto de apertura debe ser válido')
            return
        }

        try {
            await openShift({
                cash_register_id: selectedRegister,
                opening_amount: amount,
                opening_notes: notes || undefined
            })

            toast.success('Turno abierto exitosamente')
            onSuccess()
            handleClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al abrir turno')
        }
    }

    const handleClose = () => {
        setSelectedRegister(null)
        setOpeningAmount('')
        setNotes('')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Abrir Turno</h2>
                    <button
                        onClick={handleClose}
                        disabled={shiftLoading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Cash Register Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Caja Registradora
                        </label>
                        {isLoadingRegisters ? (
                            <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
                                <div className="h-4 bg-gray-300 rounded w-24"></div>
                            </div>
                        ) : cashRegisters.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-800">
                                    No hay cajas registradoras disponibles. Contacta al administrador para crear una.
                                </div>
                            </div>
                        ) : (
                            <select
                                value={selectedRegister || ''}
                                onChange={(e) => setSelectedRegister(Number(e.target.value))}
                                required
                                disabled={cashRegisters.length === 1}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            >
                                <option value="">Seleccionar caja...</option>
                                {cashRegisters.map((register) => (
                                    <option key={register.id} value={register.id}>
                                        {register.name} ({register.code})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Opening Amount */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Monto Inicial en Caja
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                                $
                            </span>
                            <input
                                type="number"
                                value={openingAmount}
                                onChange={(e) => setOpeningAmount(e.target.value)}
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
                            Cuenta el efectivo disponible antes de abrir el turno
                        </p>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Notas (Opcional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observaciones al abrir el turno..."
                            rows={3}
                            disabled={shiftLoading}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
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
                            disabled={shiftLoading || cashRegisters.length === 0}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {shiftLoading ? (
                                'Abriendo...'
                            ) : (
                                <>
                                    <DollarSign className="w-5 h-5" />
                                    Abrir Turno
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
