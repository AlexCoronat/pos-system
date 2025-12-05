'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { productService } from '@/lib/services/product.service'
import { toast } from 'sonner'
import type { ProductVariant, UpdateVariantData } from '@/lib/types/product'

interface EditVariantDialogProps {
    open: boolean
    variant: ProductVariant | null
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditVariantDialog({
    open,
    variant,
    onOpenChange,
    onSuccess
}: EditVariantDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        variantName: '',
        sku: '',
        barcode: '',
        costPrice: '',
        sellingPrice: '',
        isActive: true
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Load variant data when dialog opens
    useEffect(() => {
        if (variant && open) {
            setFormData({
                variantName: variant.variantName,
                sku: variant.sku,
                barcode: variant.barcode || '',
                costPrice: variant.costPrice?.toString() || '',
                sellingPrice: variant.sellingPrice?.toString() || '',
                isActive: variant.isActive
            })
            setErrors({})
        }
    }, [variant, open])

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.variantName.trim()) {
            newErrors.variantName = 'El nombre es requerido'
        }

        if (!formData.sku.trim()) {
            newErrors.sku = 'El SKU es requerido'
        }

        if (formData.sellingPrice && parseFloat(formData.sellingPrice) <= 0) {
            newErrors.sellingPrice = 'El precio debe ser mayor a 0'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!variant?.id || !validateForm()) {
            return
        }

        setIsLoading(true)

        try {
            const updateData: UpdateVariantData = {
                variantName: formData.variantName.trim(),
                sku: formData.sku.trim(),
                barcode: formData.barcode.trim() || undefined,
                costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
                sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined,
                isActive: formData.isActive
            }

            await productService.updateVariant(variant.id, updateData)
            toast.success('Variante actualizada exitosamente')
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error('Error updating variant:', error)
            toast.error(error.message || 'Error al actualizar la variante')
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    if (!variant) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Variante</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles de esta variante del producto
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Attributes Display */}
                    {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">Atributos:</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(variant.attributes).map(([key, value]) => (
                                    <Badge key={key} variant="outline">
                                        <span className="capitalize">{key}:</span> {value}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Variant Name */}
                    <div className="space-y-2">
                        <Label htmlFor="variantName">Nombre *</Label>
                        <Input
                            id="variantName"
                            value={formData.variantName}
                            onChange={(e) => handleChange('variantName', e.target.value)}
                            placeholder="Ej: Rojo - Grande"
                            className={errors.variantName ? 'border-red-500' : ''}
                        />
                        {errors.variantName && (
                            <p className="text-sm text-red-500">{errors.variantName}</p>
                        )}
                    </div>

                    {/* SKU */}
                    <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <Input
                            id="sku"
                            value={formData.sku}
                            onChange={(e) => handleChange('sku', e.target.value)}
                            placeholder="PROD-V01"
                            className={errors.sku ? 'border-red-500' : ''}
                        />
                        {errors.sku && (
                            <p className="text-sm text-red-500">{errors.sku}</p>
                        )}
                    </div>

                    {/* Barcode */}
                    <div className="space-y-2">
                        <Label htmlFor="barcode">Código de Barras</Label>
                        <Input
                            id="barcode"
                            value={formData.barcode}
                            onChange={(e) => handleChange('barcode', e.target.value)}
                            placeholder="EAN-13"
                        />
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="costPrice">Precio de Costo</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    $
                                </span>
                                <Input
                                    id="costPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.costPrice}
                                    onChange={(e) => handleChange('costPrice', e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sellingPrice">Precio de Venta</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    $
                                </span>
                                <Input
                                    id="sellingPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.sellingPrice}
                                    onChange={(e) => handleChange('sellingPrice', e.target.value)}
                                    placeholder="0.00"
                                    className={`pl-7 ${errors.sellingPrice ? 'border-red-500' : ''}`}
                                />
                            </div>
                            {errors.sellingPrice && (
                                <p className="text-sm text-red-500">{errors.sellingPrice}</p>
                            )}
                        </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Estado</Label>
                            <p className="text-sm text-gray-500">
                                Variante disponible para ventas
                            </p>
                        </div>
                        <Switch
                            checked={formData.isActive}
                            onCheckedChange={(checked) => handleChange('isActive', checked)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
