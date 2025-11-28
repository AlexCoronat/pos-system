/**
 * Quick Products Component
 * Top 8 selling products
 */

'use client'

import { useEffect, useState } from 'react'
import { Package, Zap } from 'lucide-react'
import { posService, type Product } from '@/lib/services/pos.service'
import { useCartStore } from '@/lib/stores/cart-store'

export function QuickProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    loadQuickProducts()
  }, [])

  const loadQuickProducts = async () => {
    setIsLoading(true)
    const data = await posService.getQuickProducts(8)
    setProducts(data)
    setIsLoading(false)
  }

  const handleAddProduct = (product: Product) => {
    try {
      addItem({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        unitPrice: product.price,
        availableStock: product.stock,
        discountPercentage: 0,
        taxPercentage: 16
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al agregar producto')
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Productos Rápidos</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Productos Rápidos</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => handleAddProduct(product)}
            disabled={product.stock <= 0}
            className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-3 hover:shadow-md transition-all text-left disabled:opacity-50"
          >
            <div className="flex items-start gap-2">
              <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-orange-600">
                  ${product.price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">
                  {product.stock > 0 ? `Stock: ${product.stock}` : 'Agotado'}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
