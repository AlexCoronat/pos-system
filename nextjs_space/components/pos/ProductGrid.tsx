/**
 * Product Grid Component
 * Display products filtered by category
 */

'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, MapPin } from 'lucide-react'
import { posService, type Product } from '@/lib/services/pos.service'
import { useCartStore } from '@/lib/stores/cart-store'
import { getBusinessContext } from '@/lib/utils/business-context'
import { ProductAvailabilityModal } from './ProductAvailabilityModal'

interface ProductGridProps {
    categoryId: number | null
}

export function ProductGrid({ categoryId }: ProductGridProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
    const [currentLocationId, setCurrentLocationId] = useState<number | undefined>(undefined)
    const addItem = useCartStore(state => state.addItem)

    useEffect(() => {
        loadProducts()
        loadUserLocation()
    }, [categoryId])

    const loadUserLocation = async () => {
        try {
            const context = await getBusinessContext()
            setCurrentLocationId(context.defaultLocationId)
        } catch (error) {
            console.error('Error loading user location:', error)
        }
    }

    const loadProducts = async () => {
        setIsLoading(true)
        const data = await posService.getProductsByCategory(categoryId || undefined)
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

    const handleCheckAvailability = (product: Product, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent triggering parent click
        setSelectedProduct(product)
        setShowAvailabilityModal(true)
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded-lg h-40 animate-pulse" />
                ))}
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay productos disponibles</p>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className={`bg-white border border-gray-200 rounded-lg p-4 text-left group ${product.stock > 0
                            ? 'hover:shadow-md transition-shadow cursor-pointer'
                            : 'opacity-75'
                            }`}
                    >
                        <div
                            onClick={() => product.stock > 0 && handleAddProduct(product)}
                            className={product.stock > 0 ? 'cursor-pointer' : ''}
                        >
                            <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                                <Package className="w-12 h-12 text-gray-400" />
                            </div>

                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                                {product.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>

                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-blue-600">
                                    ${product.price.toFixed(2)}
                                </span>
                                {product.stock > 0 ? (
                                    <span className="text-xs text-gray-500">
                                        Stock: {product.stock}
                                    </span>
                                ) : (
                                    <span className="text-xs text-red-600 font-medium">
                                        Agotado
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Add button for in-stock products */}
                        {product.stock > 0 && (
                            <div
                                onClick={() => handleAddProduct(product)}
                                className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <div className="w-full bg-blue-600 text-white rounded py-1 flex items-center justify-center gap-1 text-sm">
                                    <Plus className="w-4 h-4" />
                                    Agregar
                                </div>
                            </div>
                        )}

                        {/* Check availability button for out-of-stock products */}
                        {product.stock <= 0 && (
                            <button
                                onClick={(e) => handleCheckAvailability(product, e)}
                                className="mt-2 w-full bg-amber-100 text-amber-700 rounded py-2 flex items-center justify-center gap-1 text-xs font-medium hover:bg-amber-200 transition-colors"
                            >
                                <MapPin className="w-3 h-3" />
                                Ver disponibilidad
                            </button>
                        )}
                    </div>
                ))}
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

