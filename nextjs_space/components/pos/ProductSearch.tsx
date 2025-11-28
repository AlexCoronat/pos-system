/**
 * Product Search Component
 * Search products by name or SKU
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Package } from 'lucide-react'
import { posService, type Product } from '@/lib/services/pos.service'
import { useCartStore } from '@/lib/stores/cart-store'

export function ProductSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const addItem = useCartStore(state => state.addItem)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsLoading(true)
                const products = await posService.searchProducts(query)
                setResults(products)
                setIsLoading(false)
                setShowResults(true)
            } else {
                setResults([])
                setShowResults(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleSelectProduct = (product: Product) => {
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
            setQuery('')
            setResults([])
            setShowResults(false)
            inputRef.current?.focus()
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al agregar producto')
        }
    }

    return (
        <div ref={searchRef} className="relative w-full">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar producto... (F2)"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isLoading && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {results.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <Package className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900">${product.price.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showResults && query.trim().length >= 2 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    No se encontraron productos
                </div>
            )}
        </div>
    )
}
