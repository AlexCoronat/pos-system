/**
 * Cart Panel Component
 * Sidebar showing cart items and totals
 */

'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Trash2, CreditCard } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { CartItem } from './CartItem'
import { BrandButton } from '@/components/shared'

interface CartPanelProps {
    onCheckout: () => void
}

export function CartPanel({ onCheckout }: CartPanelProps) {
    const cart = useCartStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // F12 shortcut
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'F12' && cart.items.length > 0) {
                e.preventDefault()
                onCheckout()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [cart.items.length, onCheckout])

    if (!mounted) return null

    return (
        <div className="w-full bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold">Carrito</h2>
                        {cart.items.length > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {cart.items.length}
                            </span>
                        )}
                    </div>
                    {cart.items.length > 0 && (
                        <button
                            onClick={() => cart.clearCart()}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Items - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-3">
                    {cart.items.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">El carrito está vacío</p>
                        </div>
                    ) : (
                        cart.items.map((item) => (
                            <CartItem
                                key={`${item.productId}-${item.variantId}`}
                                productId={item.productId}
                                productName={item.productName}
                                sku={item.productSku}
                                quantity={item.quantity}
                                unitPrice={item.unitPrice}
                                discount={item.discountPercentage || 0}
                                total={item.total}
                                availableStock={item.availableStock}
                                onQuantityChange={(qty) => cart.updateItemQuantity(item.productId, qty, item.variantId)}
                                onRemove={() => cart.removeItem(item.productId, item.variantId)}
                                onDiscountChange={(disc) => cart.updateItemDiscount(item.productId, disc, item.variantId, true)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Totals - Fixed at bottom */}
            {cart.items.length > 0 && (
                <div className="flex-shrink-0 border-t p-4 bg-gray-50">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${cart.subtotal.toFixed(2)}</span>
                        </div>
                        {cart.totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento:</span>
                                <span>-${cart.totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span>IVA:</span>
                            <span>${cart.totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>${cart.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <BrandButton
                        onClick={onCheckout}
                        className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                        size="lg"
                    >
                        <CreditCard className="w-5 h-5" />
                        Pagar (F12)
                    </BrandButton>
                </div>
            )}
        </div>
    )
}
