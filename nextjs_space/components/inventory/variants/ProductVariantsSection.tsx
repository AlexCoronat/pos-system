'use client'

import { useState, useEffect } from 'react'
import { Wand2, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { VariantAttributeBuilder } from './VariantAttributeBuilder'
import { VariantEditor } from './VariantEditor'
import { productService } from '@/lib/services/product.service'
import type {
    VariantAttribute,
    VariantCombination,
    CreateVariantData
} from '@/lib/types/product'

interface ProductVariantsSectionProps {
    enabled: boolean
    productSku?: string
    productPrice?: number
    variants: CreateVariantData[]
    onToggle: (enabled: boolean) => void
    onChange: (variants: CreateVariantData[]) => void
}

export function ProductVariantsSection({
    enabled,
    productSku,
    productPrice = 0,
    variants,
    onToggle,
    onChange
}: ProductVariantsSectionProps) {
    const [attributes, setAttributes] = useState<VariantAttribute[]>([])
    const [combinations, setCombinations] = useState<VariantCombination[]>([])
    const [generatedVariants, setGeneratedVariants] = useState<CreateVariantData[]>(variants)

    useEffect(() => {
        setGeneratedVariants(variants)
    }, [variants])

    // Generate combinations when attributes change
    const handleGenerateCombinations = () => {
        if (!attributes.length || attributes.some(attr => !attr.name || !attr.values.length)) {
            return
        }

        const newCombinations = productService.generateVariantCombinations(
            attributes,
            productPrice
        )

        setCombinations(newCombinations)

        // Convert combinations to CreateVariantData format
        const variantsData: CreateVariantData[] = newCombinations.map((combo, index) => ({
            variantName: combo.name,
            sku: '', // Will be generated
            attributes: combo.attributes,
            costPrice: combo.costPrice,
            sellingPrice: combo.sellingPrice,
            isActive: true
        }))

        setGeneratedVariants(variantsData)
        onChange(variantsData)
    }

    // Generate SKU for a specific variant
    const handleGenerateVariantSku = async (index: number) => {
        if (!productSku) return

        try {
            const sku = await productService.generateVariantSKU(productSku, index + 1)
            const updated = [...generatedVariants]
            updated[index] = { ...updated[index], sku }
            setGeneratedVariants(updated)
            onChange(updated)
        } catch (error) {
            console.error('Error generating variant SKU:', error)
        }
    }

    // Generate ALL SKUs
    const handleGenerateAllSkus = async () => {
        if (!productSku) return

        try {
            const updated = await Promise.all(
                generatedVariants.map(async (variant, index) => ({
                    ...variant,
                    sku: await productService.generateVariantSKU(productSku, index + 1)
                }))
            )
            setGeneratedVariants(updated)
            onChange(updated)
        } catch (error) {
            console.error('Error generating SKUs:', error)
        }
    }

    // Update a specific variant
    const handleVariantChange = (index: number, updates: Partial<CreateVariantData>) => {
        const updated = [...generatedVariants]
        updated[index] = { ...updated[index], ...updates }
        setGeneratedVariants(updated)
        onChange(updated)
    }

    // Remove a variant
    const handleRemoveVariant = (index: number) => {
        const updated = generatedVariants.filter((_, i) => i !== index)
        setGeneratedVariants(updated)
        onChange(updated)
    }

    // Reset all
    const handleReset = () => {
        setAttributes([])
        setCombinations([])
        setGeneratedVariants([])
        onChange([])
    }

    return (
        <div className="space-y-6 border border-gray-200 rounded-lg p-6 bg-white">
            {/* Toggle */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor="has-variants" className="text-base font-medium">
                        ¿Este producto tiene variantes?
                    </Label>
                    <p className="text-sm text-gray-500">
                        Activa esta opción para crear variantes del producto (ej: colores, tallas, sabores)
                    </p>
                </div>
                <Switch
                    id="has-variants"
                    checked={enabled}
                    onCheckedChange={onToggle}
                />
            </div>

            {/* Variants Section */}
            {enabled && (
                <div className="space-y-6 pt-4 border-t border-gray-200">
                    {/* Attribute Builder */}
                    <VariantAttributeBuilder
                        attributes={attributes}
                        onChange={setAttributes}
                    />

                    {/* Generate Button */}
                    {attributes.length > 0 && attributes.every(attr => attr.name && attr.values.length > 0) && (
                        <div className="flex justify-center">
                            <Button
                                type="button"
                                onClick={handleGenerateCombinations}
                                className="gap-2"
                            >
                                <Wand2 className="h-4 w-4" />
                                Generar Variantes
                            </Button>
                        </div>
                    )}

                    {/* Generated Variants List */}
                    {generatedVariants.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">
                                        Variantes Generadas ({generatedVariants.length})
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Revisa y ajusta los precios y SKUs de cada variante
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {productSku && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateAllSkus}
                                        >
                                            Generar Todos los SKUs
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleReset}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        Reiniciar
                                    </Button>
                                </div>
                            </div>

                            {!productSku && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Define primero un SKU para el producto para poder generar SKUs automáticos para las variantes
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {generatedVariants.map((variant, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500">
                                                Variante #{index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveVariant(index)}
                                                className="h-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <VariantEditor
                                            variant={variant}
                                            index={index}
                                            productSku={productSku}
                                            onChange={handleVariantChange}
                                            onGenerateSku={handleGenerateVariantSku}
                                        />

                                        {/* Attributes Display */}
                                        {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                            <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                                                {Object.entries(variant.attributes).map(([key, value]) => (
                                                    <span key={key} className="bg-white px-2 py-1 rounded border border-gray-200">
                                                        <strong className="capitalize">{key}:</strong> {value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
