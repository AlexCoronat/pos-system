/**
 * Quick Products Component
 * Top 8 selling products
 */

'use client'

import { useEffect, useState } from 'react'
import { Package, Zap, MapPin } from 'lucide-react'
import { posService, type Product } from '@/lib/services/pos.service'
import { useCartStore } from '@/lib/stores/cart-store'
import { getBusinessContext } from '@/lib/utils/business-context'
import { ProductAvailabilityModal } from './ProductAvailabilityModal'

export function QuickProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [currentLocationId, setCurrentLocationId] = useState<number | undefined>(undefined)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    loadQuickProducts()
    loadUserLocation()
  }, [])

  const loadUserLocation = async () => {
    try {
      const context = await getBusinessContext()
      setCurrentLocationId(context.defaultLocationId)
    } catch (error) {
      console.error('Error loading user location:', error)
    }
  }

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

  const handleCheckAvailability = (product: Product) => {
    setSelectedProduct(product)
    setShowAvailabilityModal(true)
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
    <>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Productos Rápidos</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-3 transition-all text-left ${product.stock > 0 ? 'hover:shadow-md cursor-pointer' : 'opacity-75'
                }`}
            >
              <div
                onClick={() => product.stock > 0 && handleAddProduct(product)}
                className={product.stock > 0 ? 'cursor-pointer' : ''}
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
              </div>

              {/* Check availability button for out-of-stock products */}
              {product.stock <= 0 && (
                <button
                  onClick={() => handleCheckAvailability(product)}
                  className="mt-2 w-full bg-amber-100 text-amber-700 rounded py-1.5 flex items-center justify-center gap-1 text-xs font-medium hover:bg-amber-200 transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  Ver disponibilidad
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Product Availability Modal */}
      <ProductAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => {
          setShowAvailabilityModal(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku
        } : null}
        currentLocationId={currentLocationId}
      />
    </>
  )
}
