/**
 * Product Grid Component
 * Display products filtered by category
 */

'use client'

import { useEffect, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { posService, type Product } from '@/lib/services/pos.service'
import { useCartStore } from '@/lib/stores/cart-store'

interface ProductGridProps {
    categoryId: number | null
}

export function ProductGrid({ categoryId }: ProductGridProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const addItem = useCartStore(state => state.addItem)

    useEffect(() => {
        loadProducts()
    }, [categoryId])

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
                <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    disabled={product.stock <= 0}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left disabled:opacity-50 disabled:cursor-not-allowed group"
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

                    {product.stock > 0 && (
                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-full bg-blue-600 text-white rounded py-1 flex items-center justify-center gap-1 text-sm">
                                <Plus className="w-4 h-4" />
                                Agregar
                            </div>
                        </div>
                    )}
                </button>
            ))}
        </div>
    )
}
