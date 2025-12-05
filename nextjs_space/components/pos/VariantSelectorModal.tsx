'use client'

import { useState, useMemo } from 'react'
import { Search, Package, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ProductVariant } from '@/lib/types/product'

interface VariantSelectorModalProps {
    open: boolean
    productName: string
    variants: ProductVariant[]
    onSelect: (variant: ProductVariant) => void
    onCancel: () => void
}

export function VariantSelectorModal({
    open,
    productName,
    variants,
    onSelect,
    onCancel
}: VariantSelectorModalProps) {
    const [searchTerm, setSearchTerm] = useState('')

    // Filter variants by search term
    const filteredVariants = useMemo(() => {
        if (!searchTerm.trim()) return variants

        const term = searchTerm.toLowerCase()
        return variants.filter(variant => {
            // Search in variant name
            if (variant.variantName.toLowerCase().includes(term)) return true

            // Search in SKU
            if (variant.sku.toLowerCase().includes(term)) return true

            // Search in attributes
            if (variant.attributes) {
                const attrValues = Object.values(variant.attributes).join(' ').toLowerCase()
                if (attrValues.includes(term)) return true
            }

            return false
        })
    }, [variants, searchTerm])

    // Sort variants: active with stock first, then by name
    const sortedVariants = useMemo(() => {
        return [...filteredVariants].sort((a, b) => {
            // Inactive variants last
            if (a.isActive !== b.isActive) {
                return a.isActive ? -1 : 1
            }

            // Out of stock variants last
            const aStock = a.stock || 0
            const bStock = b.stock || 0
            if ((aStock <= 0) !== (bStock <= 0)) {
                return aStock > 0 ? -1 : 1
            }

            // Sort by name
            return a.variantName.localeCompare(b.variantName)
        })
    }, [filteredVariants])

    const formatPrice = (price?: number) => {
        if (!price) return 'N/A'
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(price)
    }

    const getStockBadge = (variant: ProductVariant) => {
        const stock = variant.stock || 0

        if (!variant.isActive) {
            return <Badge variant="secondary">Inactiva</Badge>
        }

        if (stock <= 0) {
            return <Badge variant="destructive">Sin Stock</Badge>
        }

        if (stock <= 5) {
            return <Badge className="bg-yellow-100 text-yellow-800">Bajo Stock ({stock})</Badge>
        }

        return <Badge className="bg-green-100 text-green-800">{stock} disponibles</Badge>
    }

    const handleSelect = (variant: ProductVariant) => {
        if (!variant.isActive || (variant.stock || 0) <= 0) {
            return
        }
        onSelect(variant)
        setSearchTerm('')
    }

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Seleccionar Variante
                    </DialogTitle>
                    <DialogDescription>
                        Elige una variante de <strong>{productName}</strong>
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nombre, SKU o atributos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        autoFocus
                    />
                </div>

                {/* Variants Grid */}
                <ScrollArea className="h-[400px] pr-4">
                    {sortedVariants.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                                {searchTerm
                                    ? 'No se encontraron variantes que coincidan con tu búsqueda'
                                    : 'No hay variantes disponibles'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {sortedVariants.map((variant) => {
                                const isAvailable = variant.isActive && (variant.stock || 0) > 0

                                return (
                                    <button
                                        key={variant.id}
                                        onClick={() => handleSelect(variant)}
                                        disabled={!isAvailable}
                                        className={`
                      w-full text-left p-4 rounded-lg border-2 transition-all
                      ${isAvailable
                                                ? 'border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                                                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                            }
                    `}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold text-gray-900 truncate">
                                                        {variant.variantName}
                                                    </h4>
                                                    {getStockBadge(variant)}
                                                </div>

                                                {/* Attributes */}
                                                {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {Object.entries(variant.attributes).map(([key, value]) => (
                                                            <Badge key={key} variant="outline" className="text-xs">
                                                                <span className="capitalize">{key}:</span> {value}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="font-mono">{variant.sku}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {formatPrice(variant.sellingPrice)}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-gray-500">
                        {sortedVariants.length} de {variants.length} variantes
                    </p>
                    <Button variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
