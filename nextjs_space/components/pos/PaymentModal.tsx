/**
 * Payment Modal Component
 * Checkout interface with multiple payment methods
 * Uses salesService (same as old working view)
 */

'use client'

import { useState } from 'react'
import { X, CreditCard, DollarSign, Smartphone, Loader2, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { salesService } from '@/lib/services/sales.service'
import type { CreatePaymentData } from '@/lib/types/sales'
import { toast } from 'sonner'

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type PaymentMethod = 'cash' | 'card' | 'transfer'

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
    const cart = useCartStore()
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
    const [amountPaid, setAmountPaid] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    if (!isOpen) return null

    const total = cart.total
    const paid = parseFloat(amountPaid) || 0
    const change = Math.max(0, paid - total)
    const isValid = paid >= total

    const handleCompleteSale = async () => {
        if (!isValid) {
            toast.error('El monto pagado debe ser mayor o igual al total')
            return
        }

        setIsProcessing(true)

        try {
            // Map payment method string to paymentMethodId number
            const paymentMethodMap: Record<PaymentMethod, number> = {
                'cash': 1,      // Efectivo
                'card': 2,      // Tarjeta
                'transfer': 3   // Transferencia
            }

            // Prepare sale data with same structure as payment-dialog
            const payments: CreatePaymentData[] = [{
                paymentMethodId: paymentMethodMap[paymentMethod],
                amount: paid
            }]

            const saleData = {
                locationId: 1, // TODO: Get from user context/settings
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
                payments
            }

            // Create sale using salesService (same as old view)
            const sale = await salesService.createSale(saleData)

            toast.success(`Venta ${sale.saleNumber} creada exitosamente!`)

            setShowSuccess(true)
            setTimeout(() => {
                cart.clearCart()
                setShowSuccess(false)
                setAmountPaid('')
                setPaymentMethod('cash')
                // Call onSuccess callback to refresh products
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
            setAmountPaid('')
        }
    }

    const paymentMethods = [
        { id: 'cash' as PaymentMethod, label: 'Efectivo', icon: DollarSign },
        { id: 'card' as PaymentMethod, label: 'Tarjeta', icon: CreditCard },
        { id: 'transfer' as PaymentMethod, label: 'Transferencia', icon: Smartphone }
    ]

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            <h2 className="text-2xl font-bold text-gray-900">Procesar Pago</h2>
                            <button
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Order Summary */}
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

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Método de Pago
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {paymentMethods.map((method) => {
                                        const Icon = method.icon
                                        const isSelected = paymentMethod === method.id
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id)}
                                                disabled={isProcessing}
                                                className={`p-4 border-2 rounded-lg transition-all ${isSelected
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                                <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                                                    {method.label}
                                                </p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Amount Paid */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Monto Recibido
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                                    <input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        disabled={isProcessing}
                                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                    />
                                </div>
                                {paid > 0 && (total - paid) > 0.01 && (
                                    <p className="text-red-600 text-sm mt-1">
                                        Falta: ${(total - paid).toFixed(2)}
                                    </p>
                                )}
                            </div>

                            {/* Change */}
                            {paymentMethod === 'cash' && paid >= total && change > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-900 font-semibold">Cambio a devolver:</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            ${change.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Quick Amount Buttons (Cash only) */}
                            {paymentMethod === 'cash' && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">Montos rápidos:</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[50, 100, 200, 500].map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setAmountPaid(String(Math.max(total, amount)))}
                                                disabled={isProcessing}
                                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                ${amount}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setAmountPaid(total.toFixed(2))}
                                        disabled={isProcessing}
                                        className="w-full mt-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-colors"
                                    >
                                        Monto exacto (${total.toFixed(2)})
                                    </button>
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
                                disabled={!isValid || isProcessing}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    'Completar Venta'
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
