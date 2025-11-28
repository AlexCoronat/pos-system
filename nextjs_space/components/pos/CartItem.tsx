/**
 * Cart Item Component
 * Individual item in shopping cart
 */

'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, Percent } from 'lucide-react'

interface CartItemProps {
    productId: number
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
    availableStock: number
    onQuantityChange: (quantity: number) => void
    onRemove: () => void
    onDiscountChange: (discount: number) => void
}

export function CartItem({
    productId,
    productName,
    sku,
    quantity,
    unitPrice,
    discount,
    total,
    availableStock,
    onQuantityChange,
    onRemove,
    onDiscountChange
}: CartItemProps) {
    const [showDiscountInput, setShowDiscountInput] = useState(false)
    const [discountValue, setDiscountValue] = useState(discount.toString())

    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity < 1) return
        if (newQuantity > availableStock) {
            alert(`Stock máximo disponible: ${availableStock}`)
            return
        }
        onQuantityChange(newQuantity)
    }

    const handleDiscountSubmit = () => {
        const value = parseFloat(discountValue) || 0
        onDiscountChange(Math.max(0, Math.min(100, value)))
        setShowDiscountInput(false)
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
            {/* Product Info */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {productName}
                    </h4>
                    <p className="text-xs text-gray-500">SKU: {sku}</p>
                </div>
                <button
                    onClick={onRemove}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center border border-gray-300 rounded">
                    <button
                        onClick={() => handleQuantityChange(quantity - 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        className="w-12 text-center border-x border-gray-300 py-1 text-sm"
                        min="1"
                        max={availableStock}
                    />
                    <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <span className="text-sm text-gray-600">
                    × ${unitPrice.toFixed(2)}
                </span>
            </div>

            {/* Discount */}
            {!showDiscountInput ? (
                <button
                    onClick={() => setShowDiscountInput(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-2"
                >
                    <Percent className="w-3 h-3" />
                    {discount > 0 ? `Descuento: ${discount}%` : 'Aplicar descuento'}
                </button>
            ) : (
                <div className="flex gap-2 mb-2">
                    <input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="% desc"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        min="0"
                        max="100"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleDiscountSubmit()
                            if (e.key === 'Escape') setShowDiscountInput(false)
                        }}
                        autoFocus
                    />
                    <button
                        onClick={handleDiscountSubmit}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        OK
                    </button>
                </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="font-bold text-gray-900">
                    ${total.toFixed(2)}
                </span>
            </div>
        </div>
    )
}
