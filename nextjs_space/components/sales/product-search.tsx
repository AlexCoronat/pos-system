'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, Plus, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/stores/cart-store'
import { useDebounce } from '@/hooks/use-debounce'
import { productService } from '@/lib/services/product.service'
import type { ProductSearchResult } from '@/lib/types/product'
import { toast } from 'sonner'

interface ProductSearchProps {
  locationId: number
  onProductAdded?: () => void
}

export function ProductSearch({ locationId, onProductAdded }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const { addItem } = useCartStore()
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Search products using ProductService
  const searchProducts = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setShowResults(true)

    try {
      const results = await productService.searchProducts(term, locationId)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching products:', error)
      toast.error('Error al buscar productos')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [locationId])

  // Effect to search when debounced term changes
  useEffect(() => {
    if (debouncedSearch) {
      searchProducts(debouncedSearch)
    }
  }, [debouncedSearch, searchProducts])

  const handleAddToCart = (result: ProductSearchResult) => {
    try {
      addItem({
        productId: result.product.id,
        productName: result.product.name,
        productSku: result.product.sku,
        quantity: 1,
        unitPrice: result.product.sellingPrice,
        availableStock: result.availableStock,
        imageUrl: result.product.imageUrl,
        discountPercentage: 0,
        taxPercentage: result.product.taxRate || 16
      })

      toast.success(`${result.product.name} agregado al carrito`)

      // Clear search
      setSearchTerm('')
      setSearchResults([])
      setShowResults(false)

      onProductAdded?.()
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar producto')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      setSearchTerm('')
    }
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm && setShowResults(true)}
          className="pl-10 pr-4 h-12 text-lg"
          autoComplete="off"
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card className="absolute z-50 w-full mt-2 max-h-96 overflow-y-auto shadow-lg">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              Buscando...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            <div className="divide-y">
              {searchResults.map((result) => (
                <div
                  key={result.product.id}
                  className="p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleAddToCart(result)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">
                          {result.product.name}
                        </h4>
                        <Badge variant="secondary" className="shrink-0">
                          {result.product.sku}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {result.product.categoryName}
                      </p>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          <span className={result.availableStock > 0 ? 'text-green-600' : 'text-red-600'}>
                            Stock: {result.availableStock}
                          </span>
                        </div>
                        <div className="font-semibold text-lg">
                          ${result.product.sellingPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={result.availableStock === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Backdrop */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
