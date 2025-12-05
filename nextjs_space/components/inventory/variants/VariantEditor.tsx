'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { CreateVariantData, VariantCombination } from '@/lib/types/product'

interface VariantEditorProps {
    variant: VariantCombination | CreateVariantData
    index: number
    productSku?: string
    onChange: (index: number, variant: Partial<CreateVariantData>) => void
    onGenerateSku?: (index: number) => void
}

export function VariantEditor({
    variant,
    index,
    productSku,
    onChange,
    onGenerateSku
}: VariantEditorProps) {
    const [localData, setLocalData] = useState({
        variantName: 'name' in variant ? variant.name : variant.variantName,
        sku: variant.sku || '',
        barcode: 'barcode' in variant ? variant.barcode : '',
        costPrice: variant.costPrice?.toString() || '',
        sellingPrice: variant.sellingPrice?.toString() || ''
    })

    // Update parent on changes
    useEffect(() => {
        onChange(index, {
            variantName: localData.variantName,
            sku: localData.sku,
            barcode: localData.barcode || undefined,
            costPrice: localData.costPrice ? parseFloat(localData.costPrice) : undefined,
            sellingPrice: localData.sellingPrice ? parseFloat(localData.sellingPrice) : undefined,
            attributes: variant.attributes
        })
    }, [localData])

    const handleChange = (field: string, value: string) => {
        setLocalData((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div className="grid grid-cols-6 gap-3 items-end">
            {/* Variant Name */}
            <div className="col-span-2">
                <Label htmlFor={`variant-name-${index}`} className="text-xs">
                    Nombre
                </Label>
                <Input
                    id={`variant-name-${index}`}
                    type="text"
                    value={localData.variantName}
                    onChange={(e) => handleChange('variantName', e.target.value)}
                    placeholder="Ej: Rojo - Grande"
                    className="mt-1"
                />
            </div>

            {/* SKU */}
            <div className="col-span-2">
                <Label htmlFor={`variant-sku-${index}`} className="text-xs">
                    SKU
                </Label>
                <div className="flex gap-1 mt-1">
                    <Input
                        id={`variant-sku-${index}`}
                        type="text"
                        value={localData.sku}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        placeholder="AUTO-V01"
                    />
                    {onGenerateSku && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onGenerateSku(index)}
                            title="Generar SKU automático"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Cost Price */}
            <div>
                <Label htmlFor={`variant-cost-${index}`} className="text-xs">
                    Costo
                </Label>
                <Input
                    id={`variant-cost-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={localData.costPrice}
                    onChange={(e) => handleChange('costPrice', e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                />
            </div>

            {/* Selling Price */}
            <div>
                <Label htmlFor={`variant-price-${index}`} className="text-xs">
                    Precio
                </Label>
                <Input
                    id={`variant-price-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={localData.sellingPrice}
                    onChange={(e) => handleChange('sellingPrice', e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                />
            </div>
        </div>
    )
}
