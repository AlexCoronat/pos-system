/**
 * Add Cash Movement Modal
 * Record expenses, deposits, or withdrawals during shift
 */

'use client'

import { useState } from 'react'
import { X, DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { cashMovementService, type MovementType } from '@/lib/services/cash-movement.service'
import { toast } from 'sonner'

interface AddMovementModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    shiftId: number
}

export function AddMovementModal({ isOpen, onClose, onSuccess, shiftId }: AddMovementModalProps) {
    const [movementType, setMovementType] = useState<'deposit' | 'withdrawal'>('withdrawal')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const amountValue = parseFloat(amount)
        if (isNaN(amountValue) || amountValue <= 0) {
            toast.error('El monto debe ser mayor a cero')
            return
        }

        if (!description.trim()) {
            toast.error('La descripción es obligatoria')
            return
        }

        setIsProcessing(true)

        try {
            await cashMovementService.createMovement({
                shift_id: shiftId,
                movement_type: movementType,
                amount: amountValue,
                description: description.trim()
            })

            toast.success(`${movementType === 'deposit' ? 'Depósito' : 'Retiro'} registrado exitosamente`)
            onSuccess()
            handleClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar movimiento')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleClose = () => {
        setMovementType('withdrawal')
        setAmount('')
        setDescription('')
        onClose()
    }

    if (!isOpen) return null

    const movementTypes = [
        {
            id: 'withdrawal' as const,
            label: 'Retiro',
            icon: TrendingDown,
            color: 'red',
            description: 'Gastos, pagos a proveedores, etc.'
        },
        {
            id: 'deposit' as const,
            label: 'Depósito',
            icon: TrendingUp,
            color: 'green',
            description: 'Ingresos adicionales, fondos añadidos'
        }
    ]

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-900">Movimiento de Efectivo</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Movement Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                            Tipo de Movimiento
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {movementTypes.map((type) => {
                                const Icon = type.icon
                                const isSelected = movementType === type.id
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setMovementType(type.id)}
                                        disabled={isProcessing}
                                        className={`p-4 border-2 rounded-lg transition-all ${isSelected
                                                ? `border-${type.color}-600 bg-${type.color}-50`
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? `text-${type.color}-600` : 'text-gray-400'
                                            }`} />
                                        <p className={`text-sm font-medium ${isSelected ? `text-${type.color}-700` : 'text-gray-700'
                                            }`}>
                                            {type.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Monto *
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                                $
                            </span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                required
                                disabled={isProcessing}
                                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Descripción / Concepto *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Pago a proveedor de refrescos, compra de cambio, etc."
                            rows={3}
                            required
                            disabled={isProcessing}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Explica claramente el motivo del {movementType === 'deposit' ? 'depósito' : 'retiro'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isProcessing}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${movementType === 'deposit'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {isProcessing ? (
                                'Registrando...'
                            ) : (
                                <>
                                    <DollarSign className="w-5 h-5" />
                                    Registrar {movementType === 'deposit' ? 'Depósito' : 'Retiro'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
