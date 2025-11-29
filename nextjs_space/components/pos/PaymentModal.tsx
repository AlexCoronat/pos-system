/**
 * Payment Modal Component
 * Checkout interface with MULTIPLE payment methods
 * Allows split payments (e.g., partial cash + partial card)
 */

'use client'

import { useState } from 'react'
import { X, CreditCard, DollarSign, Smartphone, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { salesService } from '@/lib/services/sales.service'
import type { CreatePaymentData } from '@/lib/types/sales'
import { toast } from 'sonner'
import { useEscapeKey } from '@/lib/hooks/use-keyboard-shortcuts'

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type PaymentMethod = 'cash' | 'card' | 'transfer'

interface Payment {
    id: string
    method: PaymentMethod
    amount: number
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
    const cart = useCartStore()
    const [payments, setPayments] = useState<Payment[]>([])
    const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('cash')
    const [currentAmount, setCurrentAmount] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // ESC to close modal
    useEscapeKey(() => {
        if (isOpen && !isProcessing && !showSuccess) {
            handleClose()
        }
    }, isOpen && !isProcessing && !showSuccess)

    if (!isOpen) return null

    const total = cart.total
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = Math.max(0, total - totalPaid)
    const change = Math.max(0, totalPaid - total)
    const isFullyPaid = totalPaid >= total

    const handleAddPayment = () => {
        const amount = parseFloat(currentAmount)

        if (!amount || amount <= 0) {
            toast.error('Ingresa un monto válido')
            return
        }

        if (amount > remaining && payments.length > 0) {
            toast.error(`El monto no puede exceder el restante ($${remaining.toFixed(2)})`)
            return
        }

        const newPayment: Payment = {
            id: Date.now().toString(),
            method: currentMethod,
            amount: amount
        }

        setPayments(prev => [...prev, newPayment])
        setCurrentAmount('')

        toast.success(`Pago de $${amount.toFixed(2)} añadido`)
    }

    const handleRemovePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id))
        toast.info('Pago eliminado')
    }

    const handleCompleteSale = async () => {
        if (!isFullyPaid) {
            toast.error('Debes cubrir el total antes de completar la venta')
            return
        }

        setIsProcessing(true)

        try {
            const paymentMethodMap: Record<PaymentMethod, number> = {
                'cash': 1,
                'card': 2,
                'transfer': 3
            }

            const paymentsData: CreatePaymentData[] = payments.map(p => ({
                paymentMethodId: paymentMethodMap[p.method],
                amount: p.amount
            }))

            const saleData = {
                locationId: 1,
                customerId: cart.customerId,
                items: cart.items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountAmount: item.discountAmount,
                    taxAmount: item.taxAmount,
                    taxRate: item.taxPercentage
                })),
                payments: paymentsData
            }

            const sale = await salesService.createSale(saleData)

            toast.success(`Venta ${sale.saleNumber} creada exitosamente!`)

            setShowSuccess(true)
            setTimeout(() => {
                cart.clearCart()
                setShowSuccess(false)
                setPayments([])
                setCurrentAmount('')
                setCurrentMethod('cash')
                if (onSuccess) {
                    onSuccess()
                } else {
                    onClose()
                }
            }, 2000)
        } catch (error: any) {
            console.error('Error processing payment:', error)
            toast.error(error.message || 'Error al procesar la venta')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleClose = () => {
        if (!isProcessing) {
            onClose()
            setPayments([])
            setCurrentAmount('')
        }
    }

    const paymentMethods = [
        { id: 'cash' as PaymentMethod, label: 'Efectivo', icon: DollarSign, color: 'green' },
        { id: 'card' as PaymentMethod, label: 'Tarjeta', icon: CreditCard, color: 'blue' },
        { id: 'transfer' as PaymentMethod, label: 'Transferencia', icon: Smartphone, color: 'purple' }
    ]

    const getMethodLabel = (method: PaymentMethod) => {
        return paymentMethods.find(m => m.id === method)?.label || method
    }

    const getMethodColor = (method: PaymentMethod) => {
        const color = paymentMethods.find(m => m.id === method)?.color || 'gray'
        const colors = {
            green: 'bg-green-100 text-green-700 border-green-300',
            blue: 'bg-blue-100 text-blue-700 border-blue-300',
            purple: 'bg-purple-100 text-purple-700 border-purple-300',
            gray: 'bg-gray-100 text-gray-700 border-gray-300'
        }
        return colors[color as keyof typeof colors]
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Success State */}
                {showSuccess ? (
                    <div className="p-12 text-center">
                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Venta Completada!</h2>
                        <p className="text-gray-600">La venta se procesó exitosamente</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Procesar Pago</h2>
                                <p className="text-sm text-gray-600 mt-1">Puedes dividir el pago en varios métodos</p>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Orden Summary */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">Resumen de Compra</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Productos ({cart.items.length}):</span>
                                        <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
                                    </div>
                                    {cart.totalDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Descuento:</span>
                                            <span>-${cart.totalDiscount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">IVA (16%):</span>
                                        <span className="font-medium">${cart.totalTax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                                        <span>Total:</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Status */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs text-blue-600 font-medium mb-1">Total a Pagar</p>
                                    <p className="text-lg font-bold text-blue-900">${total.toFixed(2)}</p>
                                </div>
                                <div className={`rounded-lg p-3 ${totalPaid > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                                    <p className={`text-xs font-medium mb-1 ${totalPaid > 0 ? 'text-green-600' : 'text-gray-600'}`}>Pagado</p>
                                    <p className={`text-lg font-bold ${totalPaid > 0 ? 'text-green-900' : 'text-gray-900'}`}>${totalPaid.toFixed(2)}</p>
                                </div>
                                <div className={`rounded-lg p-3 ${remaining > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                    <p className={`text-xs font-medium mb-1 ${remaining > 0 ? 'text-amber-600' : 'text-gray-600'}`}>Restante</p>
                                    <p className={`text-lg font-bold ${remaining > 0 ? 'text-amber-900' : 'text-gray-900'}`}>${remaining.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Payments Added */}
                            {payments.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Pagos Registrados</h3>
                                    <div className="space-y-2">
                                        {payments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${getMethodColor(payment.method)}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium">{getMethodLabel(payment.method)}</span>
                                                    <span className="text-sm opacity-75">•</span>
                                                    <span className="font-bold">${payment.amount.toFixed(2)}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePayment(payment.id)}
                                                    disabled={isProcessing}
                                                    className="p-1 hover:bg-red-100 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Payment Section */}
                            {remaining > 0.01 && (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-4">Agregar Pago</h3>

                                    {/* Payment Method */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Método de Pago
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {paymentMethods.map((method) => {
                                                const Icon = method.icon
                                                const isSelected = currentMethod === method.id
                                                return (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setCurrentMethod(method.id)}
                                                        disabled={isProcessing}
                                                        className={`p-3 border-2 rounded-lg transition-all ${isSelected
                                                                ? 'border-blue-600 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                                        <p className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                                                            {method.label}
                                                        </p>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                value={currentAmount}
                                                onChange={(e) => setCurrentAmount(e.target.value)}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                max={remaining}
                                                disabled={isProcessing}
                                                className="w-full pl-7 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        handleAddPayment()
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Amounts */}
                                    <div className="grid grid-cols-5 gap-2 mb-4">
                                        {[50, 100, 200, 500].map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setCurrentAmount(String(Math.min(remaining, amount)))}
                                                disabled={isProcessing}
                                                className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
                                            >
                                                ${amount}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentAmount(remaining.toFixed(2))}
                                            disabled={isProcessing}
                                            className="px-2 py-1.5 bg-blue-100 hover:bg-blue-200 rounded text-xs font-medium text-blue-700 transition-colors"
                                        >
                                            Exacto
                                        </button>
                                    </div>

                                    {/* Add Button */}
                                    <button
                                        onClick={handleAddPayment}
                                        disabled={!currentAmount || parseFloat(currentAmount) <= 0 || isProcessing}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar Pago
                                    </button>
                                </div>
                            )}

                            {/* Change */}
                            {change > 0 && payments.some(p => p.method === 'cash') && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-900 font-semibold">Cambio a devolver:</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            ${change.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCompleteSale}
                                disabled={!isFullyPaid || isProcessing}
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Completar Venta
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
