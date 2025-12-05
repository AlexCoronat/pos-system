'use client'

import { useState } from 'react'
import { Pencil, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProductVariant } from '@/lib/types/product'

interface VariantListProps {
    variants: ProductVariant[]
    onEdit: (variant: ProductVariant) => void
    onDelete: (variantId: number) => void
    onToggleActive: (variantId: number, isActive: boolean) => void
}

export function VariantsList({
    variants,
    onEdit,
    onDelete,
    onToggleActive
}: VariantListProps) {
    const formatPrice = (price?: number) => {
        if (!price) return 'N/A'
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(price)
    }

    if (variants.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">No hay variantes para este producto</p>
                <p className="text-sm text-gray-400 mt-1">
                    Crea variantes para ofrecer diferentes opciones del mismo producto
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {variants.map((variant) => (
                <div
                    key={variant.id}
                    className={`bg-white border rounded-lg p-4 transition-all ${variant.isActive
                            ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            : 'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900 truncate">
                                    {variant.variantName}
                                </h4>
                                {!variant.isActive && (
                                    <Badge variant="secondary" className="text-xs">
                                        Inactiva
                                    </Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">SKU:</span>{' '}
                                    <span className="font-mono text-gray-900">{variant.sku}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Precio:</span>{' '}
                                    <span className="font-semibold text-gray-900">
                                        {formatPrice(variant.sellingPrice)}
                                    </span>
                                </div>
                                {variant.barcode && (
                                    <div className="col-span-2">
                                        <span className="text-gray-500">Código de barras:</span>{' '}
                                        <span className="font-mono text-gray-700">{variant.barcode}</span>
                                    </div>
                                )}
                            </div>

                            {/* Attributes */}
                            {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {Object.entries(variant.attributes).map(([key, value]) => (
                                        <Badge key={key} variant="outline" className="text-xs">
                                            <span className="capitalize font-medium">{key}:</span>{' '}
                                            {value}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Stock Info (if available) */}
                            {variant.stock !== undefined && (
                                <div className="mt-3 inline-flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                    <span className="font-semibold">{variant.stock}</span>
                                    <span>unidades en stock</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(variant)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => variant.id && onToggleActive(variant.id, !variant.isActive)}
                                >
                                    {variant.isActive ? 'Desactivar' : 'Activar'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => variant.id && onDelete(variant.id)}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            ))}
        </div>
    )
}
